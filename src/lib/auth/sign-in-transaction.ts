/**
 * Server-side, one-time OIDC transaction binding.
 * A future provider callback must consume this record before verifying the
 * provider ID token's issuer, audience, signature, expiry and nonce.
 */
import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/core/store/database";

const TTL_SECONDS = 600;
function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
export function isOpaqueAuthValue(value: string): boolean {
  return /^[A-Za-z0-9_-]{43,128}$/.test(value);
}
export function createSignInSecrets(): { state: string; nonce: string } {
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
  };
}
export async function beginSignInTransaction(provider: string) {
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(provider)) throw new Error("INVALID_SIGN_IN_PROVIDER");
  const { state, nonce } = createSignInSecrets();
  await sql`
    INSERT INTO clara_auth_sign_in_transactions (state_hash, provider, nonce_hash, expires_at)
    VALUES (${digest(state)}, ${provider}, ${digest(nonce)},
      NOW() + INTERVAL '10 minutes')
  `;
  return { state, nonce, expiresIn: TTL_SECONDS };
}
export async function consumeSignInTransaction(
  provider: string,
  state: string,
  verifiedNonce: string,
): Promise<boolean> {
  if (!/^[a-z][a-z0-9_-]{1,63}$/.test(provider)
    || !isOpaqueAuthValue(state) || !isOpaqueAuthValue(verifiedNonce)) return false;
  // Atomic consumption prevents callback replay, including concurrent requests.
  const rows = await sql`
    UPDATE clara_auth_sign_in_transactions
    SET consumed_at = NOW()
    WHERE state_hash = ${digest(state)}
      AND provider = ${provider}
      AND nonce_hash = ${digest(verifiedNonce)}
      AND consumed_at IS NULL
      AND expires_at > NOW()
    RETURNING state_hash
  ` as { state_hash: string }[];
  return rows.length === 1;
}
