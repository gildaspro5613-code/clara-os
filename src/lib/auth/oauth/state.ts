import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { OAuthStatePayload } from "./types";
import { OAuthError } from "./error";

function stateSecret(): string {
  const value = process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY;
  if (!value) throw new Error("CLARA_CREDENTIALS_ENCRYPTION_KEY is not configured.");
  return value;
}

function signature(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function createOAuthNonce(): string {
  return randomBytes(32).toString("base64url");
}

export function safeOAuthRedirectPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const parsed = new URL(value, "https://clara.invalid");
    return parsed.origin === "https://clara.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch {
    return "/";
  }
}

export function signOAuthState(state: OAuthStatePayload, secret = stateSecret()): string {
  const payload = Buffer.from(JSON.stringify({
    ...state,
    redirectPath: safeOAuthRedirectPath(state.redirectPath),
  })).toString("base64url");
  return `${payload}.${signature(payload, secret).toString("base64url")}`;
}

export function verifyOAuthState(
  value: string,
  expected: { nonce: string; provider: string },
  secret = stateSecret(),
  now = Date.now(),
): OAuthStatePayload {
  const [payload, encodedSignature, extra] = value.split(".");
  if (!payload || !encodedSignature || extra) throw new OAuthError("INVALID_STATE");
  const received = Buffer.from(encodedSignature, "base64url");
  const wanted = signature(payload, secret);
  if (received.length !== wanted.length || !timingSafeEqual(received, wanted)) {
    throw new OAuthError("INVALID_STATE");
  }
  let state: OAuthStatePayload;
  try {
    state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    throw new OAuthError("INVALID_STATE");
  }
  if (!state.connectionId || !state.workspaceId || !state.nonce || !state.provider) {
    throw new OAuthError("INVALID_STATE");
  }
  if (state.expiresAt < now) throw new OAuthError("EXPIRED_STATE");
  if (state.provider !== expected.provider) throw new OAuthError("PROVIDER_MISMATCH");
  const actualNonce = Buffer.from(state.nonce);
  const expectedNonce = Buffer.from(expected.nonce);
  if (actualNonce.length !== expectedNonce.length || !timingSafeEqual(actualNonce, expectedNonce)) {
    throw new OAuthError("INVALID_STATE");
  }
  return { ...state, redirectPath: safeOAuthRedirectPath(state.redirectPath) };
}
