/**
 * Server-only completion of an independently verified provider sign-in.
 * The caller must verify the provider's cryptographic token, issuer, audience,
 * nonce and expiry before passing the identity here. Enrollment and workspace
 * grants are separate, explicitly authorized administrative operations.
 */
import { findVerifiedUser, type VerifiedIdentity } from "./verified-identity";
import { issueAuthenticatedSession } from "./authenticated-session-lifecycle";

export async function completeVerifiedSignIn(identity: VerifiedIdentity): Promise<string> {
  const userId = await findVerifiedUser(identity);
  if (!userId) throw new Error("IDENTITY_NOT_ENROLLED");
  return issueAuthenticatedSession(userId);
}
