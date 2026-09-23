/**
 * Server-only authenticated workspace resolution.
 * A future sign-in flow must create opaque, high-entropy sessions and assign
 * memberships after identity verification. This module never creates sessions.
 * No user identity or workspace is accepted from request headers or parameters.
 */
import { createHash } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import {
  authorizeWorkspace,
  type WorkspacePermission,
  type WorkspaceRole,
} from "./workspace-authorization";

export const CLARA_AUTH_COOKIE = "clara_auth_session";

type SessionRow = { user_id: string };
type MembershipRow = { workspace_id: string; role: WorkspaceRole };

export function sessionTokenDigest(token: string): string | null {
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(token)) return null;
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function resolveAuthenticatedWorkspace(
  token: string | undefined,
  workspaceId: string,
  permission: WorkspacePermission,
): Promise<{ userId: string; workspaceId: string } | null> {
  const digest = token ? sessionTokenDigest(token) : null;
  if (!digest || !workspaceId.trim() || workspaceId === "default") return null;

  // Session and membership tables are provisioned by the future sign-in
  // implementation. No fallback to global workspace or env identity.
  const sessions = await sql`
    SELECT user_id FROM clara_auth_sessions
    WHERE token_hash = ${digest}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  ` as SessionRow[];
  const session = sessions[0];
  if (!session) return null;

  const memberships = await sql`
    SELECT workspace_id, role FROM clara_workspace_memberships
    WHERE user_id = ${session.user_id}
      AND workspace_id = ${workspaceId}
      AND revoked_at IS NULL
  ` as MembershipRow[];
  try {
    return authorizeWorkspace({
      userId: session.user_id,
      memberships: memberships.map((m) => ({
        workspaceId: m.workspace_id,
        role: m.role,
      })),
    }, workspaceId, permission);
  } catch {
    return null;
  }
}
