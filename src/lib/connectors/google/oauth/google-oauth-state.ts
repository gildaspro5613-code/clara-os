import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export interface GoogleOAuthState {
  connectionId: string;
  workspaceId: string;
  nonce: string;
  expiresAt: number;
}

function stateSecret(): string {
  const secret = process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("CLARA_CREDENTIALS_ENCRYPTION_KEY is not configured.");
  }
  return secret;
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createGoogleOAuthNonce(): string {
  return randomBytes(32).toString("base64url");
}

export function signGoogleOAuthState(
  state: GoogleOAuthState,
  secret = stateSecret(),
): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export function verifyGoogleOAuthState(
  value: string,
  expectedNonce: string,
  secret = stateSecret(),
  now = Date.now(),
): GoogleOAuthState | null {
  const [payload, encodedSignature, extra] = value.split(".");
  if (!payload || !encodedSignature || extra) return null;
  const received = Buffer.from(encodedSignature, "base64url");
  const expected = signature(payload, secret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }
  let state: GoogleOAuthState;
  try {
    state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const nonceA = Buffer.from(state.nonce ?? "");
  const nonceB = Buffer.from(expectedNonce);
  if (
    nonceA.length !== nonceB.length ||
    !timingSafeEqual(nonceA, nonceB) ||
    state.expiresAt < now
  ) {
    return null;
  }
  return state;
}
