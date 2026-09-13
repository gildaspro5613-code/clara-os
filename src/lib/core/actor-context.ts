export interface ActorContext {
  readonly userId?: string;
  readonly organizationId?: string;
  readonly workspaceId?: string;
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Resolves identity metadata carried by an operational context.
 * Provider code must never invent a user identity from an organization id.
 */
export function resolveActorContext(context: unknown): ActorContext {
  if (!context || typeof context !== "object") return {};

  const candidate = context as Record<string, unknown>;
  const nested =
    candidate.actor && typeof candidate.actor === "object"
      ? candidate.actor as Record<string, unknown>
      : undefined;

  return {
    userId: cleanString(nested?.userId ?? candidate.userId),
    organizationId: cleanString(
      nested?.organizationId ?? candidate.organizationId,
    ),
    workspaceId: cleanString(nested?.workspaceId ?? candidate.workspaceId),
  };
}

export function requireUserId(context: unknown): string {
  const { userId } = resolveActorContext(context);
  if (!userId) {
    throw new Error("A stable user identity is required for user-scoped connector access.");
  }
  return userId;
}
