import { createPublicKey, verify } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import { completeVerifiedSignIn } from "./verified-sign-in";
import { enrollVerifiedIdentity, findVerifiedUser, type VerifiedIdentity } from "./verified-identity";
import { consumeSignInTransaction } from "./sign-in-transaction";

const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtClaims = {
  aud?: string;
  azp?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  hd?: string;
  iat?: number;
  iss?: string;
  nonce?: string;
  sub?: string;
};
type GoogleJwk = Record<string, string | string[] | boolean | undefined> & {
  kty: string;
  kid?: string;
  use?: string;
};

function configuredSignIn() {
  const clientId = process.env.CLARA_AUTH_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.CLARA_AUTH_GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.CLARA_AUTH_GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) throw new Error("CLARA_GOOGLE_SIGN_IN_NOT_CONFIGURED");
  return { clientId, clientSecret, redirectUri };
}

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function signingKey(kid: string): Promise<GoogleJwk> {
  const response = await fetch(GOOGLE_JWKS_ENDPOINT, { cache: "no-store" });
  if (!response.ok) throw new Error("GOOGLE_JWKS_UNAVAILABLE");
  const body = await response.json() as { keys?: GoogleJwk[] };
  const key = body.keys?.find((candidate) => candidate.kid === kid && candidate.use !== "enc");
  if (!key) throw new Error("GOOGLE_SIGNING_KEY_NOT_FOUND");
  return key;
}

export function googleSignInAuthorizationUrl(state: string, nonce: string): string {
  const { clientId, redirectUri } = configuredSignIn();
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function exchangeCode(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = configuredSignIn();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  const body = await response.json() as { id_token?: string };
  if (!response.ok || !body.id_token) throw new Error("GOOGLE_SIGN_IN_EXCHANGE_FAILED");
  return body.id_token;
}

async function verifyIdToken(idToken: string, expectedNonce: string): Promise<JwtClaims> {
  const { clientId } = configuredSignIn();
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("INVALID_GOOGLE_ID_TOKEN");
  const header = decodePart<JwtHeader>(parts[0]);
  const claims = decodePart<JwtClaims>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("INVALID_GOOGLE_ID_TOKEN_ALGORITHM");
  const key = await signingKey(header.kid);
  const publicKey = createPublicKey({ key, format: "jwk" });
  const signatureOk = verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`, "utf8"),
    publicKey,
    Buffer.from(parts[2], "base64url"),
  );
  if (!signatureOk) throw new Error("INVALID_GOOGLE_ID_TOKEN_SIGNATURE");

  const now = Math.floor(Date.now() / 1000);
  if (!claims.iss || !GOOGLE_ISSUERS.has(claims.iss) || claims.aud !== clientId) throw new Error("INVALID_GOOGLE_ID_TOKEN_SCOPE");
  if (claims.azp && claims.azp !== clientId) throw new Error("INVALID_GOOGLE_ID_TOKEN_AUTHORIZED_PARTY");
  if (!claims.exp || claims.exp <= now || (claims.iat && claims.iat > now + 60)) throw new Error("EXPIRED_GOOGLE_ID_TOKEN");
  if (!claims.nonce || claims.nonce !== expectedNonce) throw new Error("INVALID_GOOGLE_ID_TOKEN_NONCE");
  if (!claims.sub) throw new Error("INVALID_GOOGLE_IDENTITY");
  return claims;
}

async function bootstrapIfAuthorized(identity: VerifiedIdentity, claims: JwtClaims): Promise<void> {
  if (await findVerifiedUser(identity)) return;
  const expectedEmail = process.env.CLARA_AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const workspaceId = process.env.CLARA_WORKSPACE_ID?.trim();
  const verifiedEmail = claims.email?.trim().toLowerCase();
  if (
    !expectedEmail ||
    !verifiedEmail ||
    claims.email_verified !== true ||
    verifiedEmail !== expectedEmail ||
    !workspaceId ||
    workspaceId === "default"
  ) throw new Error("IDENTITY_NOT_ENROLLED");

  const userId = await enrollVerifiedIdentity(identity);
  await sql`INSERT INTO clara_auth_workspaces (id) VALUES (${workspaceId}) ON CONFLICT (id) DO NOTHING`;
  await sql`
    INSERT INTO clara_workspace_memberships (user_id, workspace_id, role)
    VALUES (${userId}, ${workspaceId}, 'owner')
    ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = 'owner', revoked_at = NULL
  `;
}

export async function completeGoogleSignIn(code: string, state: string, expectedNonce: string): Promise<string> {
  if (!code.trim()) throw new Error("GOOGLE_AUTHORIZATION_CODE_REQUIRED");
  const idToken = await exchangeCode(code);
  const claims = await verifyIdToken(idToken, expectedNonce);
  const consumed = await consumeSignInTransaction("google", state, expectedNonce);
  if (!consumed) throw new Error("INVALID_OR_REPLAYED_SIGN_IN_TRANSACTION");

  const identity: VerifiedIdentity = { issuer: "https://accounts.google.com", subject: claims.sub! };
  await bootstrapIfAuthorized(identity, claims);
  return completeVerifiedSignIn(identity);
}
