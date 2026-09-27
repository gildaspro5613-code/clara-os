import { CLARA_AUTH_COOKIE, resolveAuthenticatedWorkspace } from "./authenticated-workspace-session";
import { requireAuthenticatedOperator, type AuthenticatedOperator } from "@/lib/core/authenticated-operator";

function readAuthCookie(cookieHeader: string | null): string | undefined {
  const values = (cookieHeader ?? "").split(";").map((part) => part.trim());
  const matches = values.filter((part) => part.startsWith(`${CLARA_AUTH_COOKIE}=`));
  if (matches.length !== 1) return undefined;
  const value = matches[0].slice(CLARA_AUTH_COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43,128}$/.test(value) ? value : undefined;
}

/**
 * Resolve an operator only from Clara OS's server-issued authenticated session.
 * Workspace membership is verified server-side; conversational/session payloads
 * and client-supplied identities are never accepted.
 */
export async function resolveAuthenticatedOperator(
  cookieHeader: string | null,
  workspaceId: string,
): Promise<AuthenticatedOperator | null> {
  const token = readAuthCookie(cookieHeader);
  if (!token) return null;

  try {
    const principal = await resolveAuthenticatedWorkspace(
      token,
      workspaceId,
      "connections:manage",
    );
    if (!principal) return null;

    return requireAuthenticatedOperator({
      id: principal.userId,
      authenticationSource: "clara-os-auth-session",
      authenticatedAt: new Date(),
    });
  } catch {
    return null;
  }
}
