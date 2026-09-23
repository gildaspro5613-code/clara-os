/**
 * Server-side Microsoft route authorization. Never trust a workspace identifier
 * from a query string, header or cookie without a verified session membership.
 * This helper is deliberately not wired into routes until sign-in provisions
 * server-issued sessions and an authorized workspace selection.
 */
import { resolveAuthenticatedWorkspace, CLARA_AUTH_COOKIE } from "@/lib/auth/authenticated-workspace-session";
import type { WorkspacePermission } from "@/lib/auth/workspace-authorization";

export function readAuthCookie(cookieHeader: string | null): string | undefined {
  const values = (cookieHeader ?? "").split(";").map((part) => part.trim());
  const matches = values.filter((part) => part.startsWith(`${CLARA_AUTH_COOKIE}=`));
  // Duplicate cookies are ambiguous and must not authorize a request.
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice(CLARA_AUTH_COOKIE.length + 1);
  // Opaque session tokens are URL-safe and never need decoding.
  return /^[A-Za-z0-9_-]{43,128}$/.test(value) ? value : undefined;
}

export async function authorizeMicrosoftRequest(
  cookieHeader: string | null,
  serverSelectedWorkspaceId: string,
  permission: WorkspacePermission,
): Promise<{ userId: string; workspaceId: string } | null> {
  const token = readAuthCookie(cookieHeader);
  if (!token) return null;
  try {
    return await resolveAuthenticatedWorkspace(token, serverSelectedWorkspaceId, permission);
  } catch {
    // Missing schema, unavailable DB and authorization errors all fail closed.
    return null;
  }
}
