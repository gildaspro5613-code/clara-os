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
 * Returns a short-lived Google credential for one authenticated Clara user.
 * The Vercel Connect subject is always the stable user id, never an organization id.
 */
export async function getGoogleWorkspaceTokenForUser(
  userId: string,
): Promise<string> {
  const id = userId.trim();
  if (!id) {
    throw new Error("userId is required for Google Vercel Connect access.");
  }

  return getToken(connectorId(), {
    subject: { type: "user", id },
  });
}

/**
 * Indicates whether this deployment is configured to use Vercel Connect for Google.
 */
export function isGoogleVercelConnectConfigured(): boolean {
  return Boolean(GOOGLE_CONNECTOR);
}
