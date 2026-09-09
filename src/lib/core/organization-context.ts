/**
 * ============================================
 * CLARA OS
 * Organization Context
 * --------------------------------------------
 * Canonical tenant identity carried through Core,
 * Brain and Runtime without provider details.
 * ============================================
 */

export interface OrganizationContext {
  /** Stable Clara OS organization/tenant identifier. */
  organizationId: string;
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
