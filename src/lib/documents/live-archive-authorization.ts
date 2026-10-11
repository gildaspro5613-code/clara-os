import type { LiveArchiveReference } from "./live-archive-reference";

/** Trusted Live response supplied by the scoped canonical server bridge.
 * Only consume a response fetched server-to-server from the configured Live
 * origin after authenticated OS session resolution. Never accept this from
 * a browser, incoming event, archive POST body or a product token alone.
 */
export interface LiveArchiveAuthorization {
  schemaVersion: "clara.live-archive-authorization.v1";
  productId: "clara-live";
  osUserId: string;
  workspaceId: string;
  clientId: string;
  projectId: string;
  liveProjectId: string;
  status: "active" | "completed";
  completedAt: string | null;
  verifiedAt: string;
  expiresAt: string;
  displayName: string;
  sourceUrl?: string;
  permissions: { workspace: boolean; client: boolean; project: boolean; read: boolean; archive: boolean };
}

export class LiveArchiveAuthorizationError extends Error {
  constructor() { super("LIVE_ARCHIVE_ACCESS_DENIED"); }
}

/** Pure gate shared by the canonical archive service. No network calls.
 * An authenticated principal is resolved from OS's actual server session;
 * the adapter establishes canonical associations in OS and verifies Live, not echo
 * caller-selected identifiers. See docs/documents-workspace-v2.md.
 */
export function verifyLiveArchiveAuthorization(
  reference: LiveArchiveReference,
  principal: { userId: string; workspaceId: string } | null,
  authorization: LiveArchiveAuthorization | null,
  operation: "read" | "archive",
  now = Date.now(),
): void {
  const a = authorization;
  const verified = Date.parse(a?.verifiedAt ?? "");
  const expires = Date.parse(a?.expiresAt ?? "");
  const completed = Date.parse(a?.completedAt ?? "");
  if (!principal?.userId || !a || !Number.isFinite(now) ||
      a.schemaVersion !== "clara.live-archive-authorization.v1" || a.productId !== "clara-live" ||
      a.osUserId !== principal.userId || a.workspaceId !== principal.workspaceId ||
      a.workspaceId !== reference.workspaceId || a.clientId !== reference.clientId ||
      a.projectId !== reference.projectId || a.liveProjectId !== reference.liveProjectId ||
      (a.status !== "completed" && a.status !== "active") ||
      (a.status === "completed" && (!Number.isFinite(completed) || completed > now)) ||
      (operation === "archive" && a.status !== "completed") ||
      !Number.isFinite(verified) || !Number.isFinite(expires) || verified > now || expires <= now ||
      expires - verified > 60_000 || expires <= verified ||
      (operation === "archive" && (a.displayName !== reference.displayName || a.sourceUrl !== reference.sourceUrl)) ||
      a.permissions?.workspace !== true || a.permissions?.client !== true || a.permissions?.project !== true ||
      a.permissions?.[operation] !== true) {
    throw new LiveArchiveAuthorizationError();
  }
}
