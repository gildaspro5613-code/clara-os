import { createPublicKey, verify } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import { completeVerifiedSignIn } from "./verified-sign-in";
import { enrollVerifiedIdentity, findVerifiedUser, type VerifiedIdentity } from "./verified-identity";
import { consumeSignInTransaction } from "./sign-in-transaction";

const MICROSOFT_HOST = "https://login.microsoftonline.com";

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtClaims = {
  aud?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
  nonce?: string;
  oid?: string;
  sub?: string;
  tid?: string;
  email?: string;
  preferred_username?: string;
};
type MicrosoftJwk = Record<string, string | string[] | boolean | undefined> & {
  kty: string;
  kid?: string;
  use?: string;
};

function configuredSignIn() {
  const tenantId = process.env.CLARA_AUTH_MICROSOFT_TENANT_ID?.trim();
  const clientId = process.env.CLARA_AUTH_MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.CLARA_AUTH_MICROSOFT_CLIENT_SECRET?.trim();
  const redirectUri = process.env.CLARA_AUTH_MICROSOFT_REDIRECT_URI?.trim();
  if (!tenantId || !clientId || !clientSecret || !redirectUri || tenantId === "organizations" || tenantId === "common") {
    throw new Error("CLARA_MICROSOFT_SIGN_IN_NOT_CONFIGURED");
  }
  return { tenantId, clientId, clientSecret, redirectUri };
}

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function signingKey(tenantId: string, kid: string): Promise<MicrosoftJwk> {
  const response = await fetch(`${MICROSOFT_HOST}/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`, { cache: "no-store" });
  if (!response.ok) throw new Error("MICROSOFT_JWKS_UNAVAILABLE");
  const body = await response.json() as { keys?: MicrosoftJwk[] };
  const key = body.keys?.find((candidate) => candidate.kid === kid && candidate.use !== "enc");
  if (!key) throw new Error("MICROSOFT_SIGNING_KEY_NOT_FOUND");
  return key;
}

export function microsoftSignInAuthorizationUrl(state: string, nonce: string): string {
  const { tenantId, clientId, redirectUri } = configuredSignIn();
  const url = new URL(`${MICROSOFT_HOST}/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function exchangeCode(code: string): Promise<string> {
  const { tenantId, clientId, clientSecret, redirectUri } = configuredSignIn();
  const response = await fetch(`${MICROSOFT_HOST}/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri, scope: "openid profile email" }),
    cache: "no-store",
  });
  const body = await response.json() as { id_token?: string };
  if (!response.ok || !body.id_token) throw new Error("MICROSOFT_SIGN_IN_EXCHANGE_FAILED");
  return body.id_token;
}

async function verifyIdToken(idToken: string, expectedNonce: string): Promise<JwtClaims> {
  const { tenantId, clientId } = configuredSignIn();
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("INVALID_MICROSOFT_ID_TOKEN");
  const header = decodePart<JwtHeader>(parts[0]);
  const claims = decodePart<JwtClaims>(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("INVALID_MICROSOFT_ID_TOKEN_ALGORITHM");
  const key = await signingKey(tenantId, header.kid);
  const publicKey = createPublicKey({ key, format: "jwk" });
  const signatureOk = verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`, "utf8"), publicKey, Buffer.from(parts[2], "base64url"));
  if (!signatureOk) throw new Error("INVALID_MICROSOFT_ID_TOKEN_SIGNATURE");

  const now = Math.floor(Date.now() / 1000);
  const issuer = `${MICROSOFT_HOST}/${tenantId}/v2.0`;
  if (claims.iss !== issuer || claims.aud !== clientId || claims.tid !== tenantId) throw new Error("INVALID_MICROSOFT_ID_TOKEN_SCOPE");
  if (!claims.exp || claims.exp <= now || (claims.nbf && claims.nbf > now + 60)) throw new Error("EXPIRED_MICROSOFT_ID_TOKEN");
  if (!claims.nonce || claims.nonce !== expectedNonce) throw new Error("INVALID_MICROSOFT_ID_TOKEN_NONCE");
  if (!claims.oid && !claims.sub) throw new Error("INVALID_MICROSOFT_IDENTITY");
  return claims;
}

async function bootstrapIfAuthorized(identity: VerifiedIdentity, claims: JwtClaims): Promise<void> {
  if (await findVerifiedUser(identity)) return;
  const expectedEmail = process.env.CLARA_AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const workspaceId = process.env.CLARA_WORKSPACE_ID?.trim();
  const verifiedEmail = (claims.email ?? claims.preferred_username)?.trim().toLowerCase();
  if (!expectedEmail || !verifiedEmail || verifiedEmail !== expectedEmail || !workspaceId || workspaceId === "default") throw new Error("IDENTITY_NOT_ENROLLED");

  const userId = await enrollVerifiedIdentity(identity);
  await sql`INSERT INTO clara_auth_workspaces (id) VALUES (${workspaceId}) ON CONFLICT (id) DO NOTHING`;
  await sql`
    INSERT INTO clara_workspace_memberships (user_id, workspace_id, role)
    VALUES (${userId}, ${workspaceId}, 'owner')
    ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = 'owner', revoked_at = NULL
  `;
}

export async function completeMicrosoftSignIn(code: string, state: string, expectedNonce: string): Promise<string> {
  if (!code.trim()) throw new Error("MICROSOFT_AUTHORIZATION_CODE_REQUIRED");
  const idToken = await exchangeCode(code);
  const claims = await verifyIdToken(idToken, expectedNonce);
  const consumed = await consumeSignInTransaction("microsoft", state, expectedNonce);
  if (!consumed) throw new Error("INVALID_OR_REPLAYED_SIGN_IN_TRANSACTION");

  const { tenantId } = configuredSignIn();
  const identity: VerifiedIdentity = { issuer: `${MICROSOFT_HOST}/${tenantId}/v2.0`, subject: claims.oid ?? claims.sub! };
  await bootstrapIfAuthorized(identity, claims);
  return completeVerifiedSignIn(identity);
}
