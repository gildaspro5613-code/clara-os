import { getToken } from "@vercel/connect";

const GOOGLE_CONNECTOR = process.env.VERCEL_CONNECT_GOOGLE_CONNECTOR?.trim();

function connectorId(): string {
  if (!GOOGLE_CONNECTOR) {
    throw new Error("Missing VERCEL_CONNECT_GOOGLE_CONNECTOR configuration.");
  }
  return GOOGLE_CONNECTOR.startsWith("google/")
    ? GOOGLE_CONNECTOR
    : `google/${GOOGLE_CONNECTOR}`;
}

/**
 * Requests a short-lived Google credential from Vercel Connect for one
 * authenticated Clara user. The subject id is Clara's stable user identity,
 * never an organization id and never the Google email address itself.
 *
 * Raw provider credentials stay below the Capability/Connector layer and must
 * never be copied into Brain, Journal, Mission or PostgreSQL.
 */
export async function getGoogleWorkspaceTokenForUser(
  userId: string,
): Promise<string> {
  const id = userId.trim();
  if (!id) throw new Error("userId is required.");

  return getToken(connectorId(), {
    subject: { type: "user", id },
  });
}
