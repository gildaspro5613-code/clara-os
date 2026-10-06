function configuredWorkspaceId(): string {
  const workspaceId = (
    process.env.CLARA_MD_WORKSPACE_ID ??
    process.env.CLARA_WORKSPACE_ID ??
    "melodie-digital"
  ).trim();

  if (!workspaceId || workspaceId === "default") {
    throw new Error("A non-default Clara workspace is required for connections.");
  }

  return workspaceId;
}

/**
 * Server-owned workspace used by connection OAuth handshakes.
 *
 * This is deliberately not an authenticated operator principal: starting or
 * completing a provider OAuth handshake establishes provider credentials for
 * the configured Clara workspace. Committing operator decisions and physical
 * execution remain behind the authenticated Clara session boundary.
 */
export const CURRENT_WORKSPACE_ID = configuredWorkspaceId();
