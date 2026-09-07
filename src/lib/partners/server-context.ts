export interface PartnerPrincipal {
  actorId: string;
  workspaceId: string;
}

/**
 * Internal Clara OS principal used by Partner Management routes until the
 * authenticated workspace/session layer is centralized application-wide.
 * Mirrors the existing Clara API environment contract and never trusts a
 * client-supplied workspace id.
 */
export function getPartnerPrincipal(): PartnerPrincipal {
  return {
    actorId: process.env.CLARA_ACTOR_ID ?? "owner",
    workspaceId: process.env.CLARA_WORKSPACE_ID ?? "melodie-digital",
  };
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
