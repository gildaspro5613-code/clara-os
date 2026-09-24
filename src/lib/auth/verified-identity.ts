/**
 * Trusted sign-in adapter boundary. Only invoke this module after a provider's
 * signature, issuer, audience, nonce and expiration have been verified on the
 * server. Never pass unverified browser claims to this module.
 */
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/core/store/database";

export type VerifiedIdentity = Readonly<{
  issuer: string;
  subject: string;
}>;

export function validateVerifiedIdentity(identity: VerifiedIdentity): void {
  if (!identity.issuer.trim() || !identity.subject.trim()
    || identity.issuer.length > 2048 || identity.subject.length > 2048) {
    throw new Error("INVALID_VERIFIED_IDENTITY");
  }
}

export async function findVerifiedUser(identity: VerifiedIdentity): Promise<string | null> {
  validateVerifiedIdentity(identity);
  const rows = await sql`
    SELECT user_id FROM clara_auth_identities
    WHERE issuer = ${identity.issuer} AND subject = ${identity.subject}
    LIMIT 1
  ` as { user_id: string }[];
  return rows[0]?.user_id ?? null;
}

/**
 * Called exclusively by a verified sign-in adapter after account enrollment
 * has been authorized. Does not grant workspace membership or issue sessions.
 * An existing identity always maps to its existing user; never reassign it.
 */
export async function enrollVerifiedIdentity(identity: VerifiedIdentity): Promise<string> {
  validateVerifiedIdentity(identity);
  const existing = await findVerifiedUser(identity);
  if (existing) return existing;
  const userId = randomUUID();
  // A concurrent enrollment may win the identity unique constraint. In that
  // case the unused provisional user can be cleaned up separately.
  const rows = await sql`
    WITH inserted_user AS (
      INSERT INTO clara_auth_users (id) VALUES (${userId})
      RETURNING id
    ), identity_insert AS (
      INSERT INTO clara_auth_identities (issuer, subject, user_id)
      SELECT ${identity.issuer}, ${identity.subject}, id FROM inserted_user
      ON CONFLICT (issuer, subject) DO NOTHING
      RETURNING user_id
    )
    SELECT user_id FROM identity_insert
  ` as { user_id: string }[];
  if (rows[0]) return rows[0].user_id;
  // A concurrent request won. Delete only our unused provisional user.
  await sql`DELETE FROM clara_auth_users WHERE id = ${userId}`;
  // No membership or session is granted.
  const winner = await findVerifiedUser(identity);
  if (!winner) throw new Error("IDENTITY_ENROLLMENT_UNAVAILABLE");
  return winner;
}
