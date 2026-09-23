/**
 * Shared authorization contract for future authenticated Clara OS connectors.
 * A trusted server-side session resolver must supply the principal and
 * memberships. Never construct this principal from request parameters,
 * unsigned cookies, environment defaults or the Clara conversational session.
 */
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface AuthenticatedWorkspacePrincipal {
  readonly userId: string;
  readonly memberships: ReadonlyArray<{
    readonly workspaceId: string;
    readonly role: WorkspaceRole;
  }>;
}

export type WorkspacePermission = "connections:read" | "connections:manage";

export class WorkspaceAuthorizationError extends Error {
  constructor() {
    super("WORKSPACE_ACCESS_DENIED");
    this.name = "WorkspaceAuthorizationError";
  }
}

/** Pure policy; this does NOT authenticate the caller. */
export function authorizeWorkspace(
  principal: AuthenticatedWorkspacePrincipal | null,
  workspaceId: string,
  permission: WorkspacePermission,
): { userId: string; workspaceId: string } {
  if (!principal?.userId?.trim() || !workspaceId?.trim() || workspaceId === "default") {
    throw new WorkspaceAuthorizationError();
  }
  const membership = principal.memberships.find(
    (item) => item.workspaceId === workspaceId,
  );
  if (!membership) throw new WorkspaceAuthorizationError();
  if (permission === "connections:manage" && !["owner", "admin"].includes(membership.role)) {
    throw new WorkspaceAuthorizationError();
  }
  return { userId: principal.userId, workspaceId };
}
