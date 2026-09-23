/**
 * Resolve a workspace exclusively from a valid server-issued session.
 * Until workspace selection is implemented, users with multiple memberships
 * must choose via a future authenticated server-side selection flow.
 */
import { sql } from "@/lib/core/store/database";
import { sessionTokenDigest } from "./authenticated-workspace-session";
import { authorizeWorkspace, type WorkspacePermission, type WorkspaceRole } from "./workspace-authorization";

type Row = { user_id: string; workspace_id: string; role: WorkspaceRole };

export async function resolveSoleAuthenticatedWorkspace(
  token: string | undefined,
  permission: WorkspacePermission,
): Promise<{ userId: string; workspaceId: string } | null> {
  const digest = token ? sessionTokenDigest(token) : null;
  if (!digest) return null;
  const rows = await sql`
    SELECT s.user_id, m.workspace_id, m.role
    FROM clara_auth_sessions s
    JOIN clara_workspace_memberships m ON m.user_id = s.user_id
    WHERE s.token_hash = ${digest}
      AND s.revoked_at IS NULL AND s.expires_at > NOW()
      AND m.revoked_at IS NULL AND m.workspace_id <> 'default'
    LIMIT 2
  ` as Row[];
  if (rows.length !== 1) return null;
  try {
    return authorizeWorkspace({
      userId: rows[0].user_id,
      memberships: [{ workspaceId: rows[0].workspace_id, role: rows[0].role }],
    }, rows[0].workspace_id, permission);
  } catch {
    return null;
  }
}
