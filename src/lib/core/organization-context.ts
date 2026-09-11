/**
 * ============================================
 * CLARA OS
 * Organization Context
 * --------------------------------------------
 * Canonical tenant and actor identity carried through Core,
 * Brain and Runtime without provider details.
 * ============================================
 */

export interface OrganizationContext {
  /** Stable Clara OS organization/tenant identifier. */
  organizationId: string;
  /** Stable Clara OS user identifier acting inside the organization. */
  userId: string;
}

export function resolveOrganizationId(context: unknown): string | undefined {
  if (!context || typeof context !== "object") return undefined;

  const value = context as {
    organizationId?: unknown;
    organization?: { id?: unknown; organizationId?: unknown };
  };

  const candidate =
    value.organizationId ??
    value.organization?.organizationId ??
    value.organization?.id;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : undefined;
}

/** Resolves the authenticated Clara user acting in the current context. */
export function resolveUserId(context: unknown): string | undefined {
  if (!context || typeof context !== "object") return undefined;

  const value = context as {
    userId?: unknown;
    user?: { id?: unknown; userId?: unknown };
    actor?: { id?: unknown; userId?: unknown };
  };

  const candidate =
    value.userId ??
    value.user?.userId ??
    value.user?.id ??
    value.actor?.userId ??
    value.actor?.id;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : undefined;
}
