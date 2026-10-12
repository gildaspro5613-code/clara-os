/**
 * Clara Live -> Clara OS documentary archive reference contract.
 * This module does not modify or delete the original Live project.
 */
export const LIVE_ARCHIVE_REFERENCE_VERSION = "clara.live-archive-reference.v1" as const;
export class LiveArchiveValidationError extends Error {}

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
  if (typeof value !== "string" || !value.trim() || value.length > MAX_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new LiveArchiveValidationError(`Invalid Live archive reference: ${field}`);
  }
  return value.trim();
}

export function parseLiveArchiveReference(input: unknown): LiveArchiveReference {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new LiveArchiveValidationError("Invalid Live archive reference");
  }
  const record = input as Record<string, unknown>;
  if (record.version !== LIVE_ARCHIVE_REFERENCE_VERSION ||
      record.productId !== "clara-live" || record.status !== "archived") {
    throw new LiveArchiveValidationError("Unsupported Live archive reference contract");
  }
  const archivedAt = requiredId(record.archivedAt, "archivedAt");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(archivedAt) ||
      !Number.isFinite(Date.parse(archivedAt))) {
    throw new LiveArchiveValidationError("Invalid Live archive date");
  }
  const [year, month, day] = archivedAt.slice(0, 10).split("-").map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) {
    throw new LiveArchiveValidationError("Invalid Live archive date");
  }
  const displayName = requiredId(record.displayName, "displayName");
  let sourceUrl: string | undefined;
  if (record.sourceUrl !== undefined) {
    if (typeof record.sourceUrl !== "string" || record.sourceUrl.length > 2048) throw new LiveArchiveValidationError("Invalid Live source URL");
    let parsed: URL;
    try { parsed = new URL(record.sourceUrl); } catch { throw new LiveArchiveValidationError("Invalid Live source URL"); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new LiveArchiveValidationError("Live source URL must use HTTPS without credentials");
    }
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
    archivedAt: new Date(archivedAt).toISOString(),
    displayName,
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

/** Stable logical key for idempotent storage; not an authorization decision. */
export function liveArchiveReferenceKey(ref: LiveArchiveReference): string {
  return JSON.stringify([ref.workspaceId, ref.clientId, ref.liveProjectId]);
}
