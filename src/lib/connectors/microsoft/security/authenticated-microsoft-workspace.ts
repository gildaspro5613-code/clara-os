import { resolveSoleAuthenticatedWorkspace } from "@/lib/auth/sole-authenticated-workspace";
import { readAuthCookie } from "./request-authorization";
import type { WorkspacePermission } from "@/lib/auth/workspace-authorization";

export async function authenticatedMicrosoftWorkspace(
  cookieHeader: string | null,
  permission: WorkspacePermission,
): Promise<{ userId: string; workspaceId: string } | null> {
  const token = readAuthCookie(cookieHeader);
  if (!token) return null;
  try {
    return await resolveSoleAuthenticatedWorkspace(token, permission);
  } catch {
    return null;
  }
}
