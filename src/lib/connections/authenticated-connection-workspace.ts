import { cookies } from "next/headers";
import { CLARA_AUTH_COOKIE } from "@/lib/auth/authenticated-workspace-session";
import { resolveSoleAuthenticatedWorkspace } from "@/lib/auth/sole-authenticated-workspace";

/** Resolve connector scope exclusively from Clara's authenticated server session. */
export async function resolveAuthenticatedConnectionWorkspace(
  permission: "connections:read" | "connections:manage",
): Promise<{ userId: string; workspaceId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLARA_AUTH_COOKIE)?.value;
  return resolveSoleAuthenticatedWorkspace(token, permission);
}
