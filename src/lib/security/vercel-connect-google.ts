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
 * Requests a short-lived Google credential from Vercel Connect for one Clara
 * organization. Raw provider credentials stay below the Capability/Connector
 * layer and must never be copied into Brain, Journal, Mission or PostgreSQL.
 */
export async function getGoogleWorkspaceTokenForOrganization(
  organizationId: string,
): Promise<string> {
  const id = organizationId.trim();
  if (!id) throw new Error("organizationId is required.");

  return getToken(connectorId(), {
    subject: { type: "user", id },
  });
}
