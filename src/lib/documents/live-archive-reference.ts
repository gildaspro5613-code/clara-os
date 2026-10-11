/**
 * Clara Live -> Clara OS documentary archive reference contract.
 * This module does not modify or delete the original Live project.
 */
export const LIVE_ARCHIVE_REFERENCE_VERSION = "clara.live-archive-reference.v1" as const;

export interface LiveArchiveReference {
  version: typeof LIVE_ARCHIVE_REFERENCE_VERSION;
  workspaceId: string;
  clientId: string;
  projectId: string;
  liveProjectId: string;
  productId: "clara-live";
  status: "archived";
  archivedAt: string;
  displayName: string;
  sourceUrl?: string;
}

const MAX_ID_LENGTH = 160;

function requiredId(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_ID_LENGTH) {
    throw new Error(`Invalid Live archive reference: ${field}`);
  }
  return value.trim();
}

export function parseLiveArchiveReference(input: unknown): LiveArchiveReference {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid Live archive reference");
  }
  const record = input as Record<string, unknown>;
  if (record.version !== LIVE_ARCHIVE_REFERENCE_VERSION ||
      record.productId !== "clara-live" || record.status !== "archived") {
    throw new Error("Unsupported Live archive reference contract");
  }
  const archivedAt = requiredId(record.archivedAt, "archivedAt");
  if (!/^\\d{4}-\\d{2}-\\d{2}T/.test(archivedAt) ||
      !Number.isFinite(Date.parse(archivedAt))) {
    throw new Error("Invalid Live archive date");
  }
  const displayName = requiredId(record.displayName, "displayName");
  let sourceUrl: string | undefined;
  if (record.sourceUrl !== undefined) {
    if (typeof record.sourceUrl !== "string") throw new Error("Invalid Live source URL");
    const parsed = new URL(record.sourceUrl);
    if (parsed.protocol !== "https:") throw new Error("Live source URL must use HTTPS");
    sourceUrl = parsed.toString();
  }
  return {
    version: LIVE_ARCHIVE_REFERENCE_VERSION,
    workspaceId: requiredId(record.workspaceId, "workspaceId"),
    clientId: requiredId(record.clientId, "clientId"),
    projectId: requiredId(record.projectId, "projectId"),
    liveProjectId: requiredId(record.liveProjectId, "liveProjectId"),
    productId: "clara-live",
    status: "archived",
    archivedAt,
    displayName,
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

/** Stable logical key for idempotent storage; not an authorization decision. */
export function liveArchiveReferenceKey(ref: LiveArchiveReference): string {
  return JSON.stringify([ref.workspaceId, ref.clientId, ref.liveProjectId]);
}
