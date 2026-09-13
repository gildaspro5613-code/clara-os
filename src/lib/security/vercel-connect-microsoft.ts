import { getToken } from "@vercel/connect";

const MICROSOFT_CONNECTOR =
  process.env.VERCEL_CONNECT_MICROSOFT_CONNECTOR?.trim();

function connectorId(): string {
  if (!MICROSOFT_CONNECTOR) {
    throw new Error(
      "Missing VERCEL_CONNECT_MICROSOFT_CONNECTOR configuration.",
    );
  }

  return MICROSOFT_CONNECTOR;
}

/**
 * Returns a short-lived Microsoft credential for one authenticated Clara user.
 * The Vercel Connect subject is always the stable user id, never an organization id.
 *
 * The connector id is supplied exactly as configured in Vercel so this layer does
 * not assume a provider-specific connector naming convention.
 */
export async function getMicrosoftGraphTokenForUser(
  userId: string,
): Promise<string> {
  const id = userId.trim();
  if (!id) {
    throw new Error("userId is required for Microsoft Vercel Connect access.");
  }

  return getToken(connectorId(), {
    subject: { type: "user", id },
  });
}

/**
 * Indicates whether this deployment is configured to use Vercel Connect for Microsoft.
 */
export function isMicrosoftVercelConnectConfigured(): boolean {
  return Boolean(MICROSOFT_CONNECTOR);
}
