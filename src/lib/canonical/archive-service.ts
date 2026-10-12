import { canonicalArchiveAuthority, type CanonicalScope } from "./archive-authority";
import { callLiveCanonical } from "./live-bridge";
import { RegistryError, type RegistryContext } from "./registry";
import { parseLiveArchiveReference, type LiveArchiveReference } from "@/lib/documents/live-archive-reference";
import { verifyLiveArchiveAuthorization, type LiveArchiveAuthorization } from "@/lib/documents/live-archive-authorization";

export function createCanonicalArchiveService(authority = canonicalArchiveAuthority, call = callLiveCanonical) {
  async function grant(context: RegistryContext, client: string, project: string, operation: "read" | "archive") {
    const { scope, ticket } = await authority.issue(context,client,project,operation);
    const body = await call(`/api/core/projects/${encodeURIComponent(scope.liveProjectId)}/archive-authorization`, {
      schemaVersion: "clara.live-archive-authorization-request.v1", operation, authorizationTicket: ticket,
      osUserId: scope.osUserId, workspaceId: scope.workspaceId, clientId: scope.clientId, projectId: scope.projectId,
    }) as { authorization?: LiveArchiveAuthorization };
    const authorization = body.authorization;
    if (!authorization || authorization.sourceUrl !== `https://live.melodie.digital/projects/${encodeURIComponent(scope.liveProjectId)}`)
      throw new RegistryError(403, "LIVE_ARCHIVE_ACCESS_DENIED");
    return { scope, ticket, authorization };
  }
  function reference(scope: CanonicalScope, a: LiveArchiveAuthorization) {
    return parseLiveArchiveReference({ version: "clara.live-archive-reference.v1", productId:"clara-live", status:"archived",
      workspaceId:scope.workspaceId, clientId:scope.clientId, projectId:scope.projectId, liveProjectId:scope.liveProjectId,
      archivedAt:new Date().toISOString(), displayName:scope.projectName, sourceUrl:a.sourceUrl });
  }
  function verify(record: LiveArchiveReference, scope: CanonicalScope, a: LiveArchiveAuthorization, operation: "read" | "archive") {
    try { verifyLiveArchiveAuthorization(record, { userId:scope.osUserId,workspaceId:scope.workspaceId },a,operation); }
    catch { throw new RegistryError(403, "LIVE_ARCHIVE_ACCESS_DENIED"); }
  }
  async function archive(context: RegistryContext, client: string, project: string) {
    const { scope,ticket,authorization } = await grant(context,client,project,"archive");
    const record = reference(scope,authorization);
    verify(record,scope,authorization,"archive");
    if (!Number.isSafeInteger(authorization.lifecycleRevision) || authorization.lifecycleRevision! < 1)
      throw new RegistryError(403,"LIVE_CLOSURE_REVISION_REQUIRED");
    // Live serializes this callback with reopen on the same Mongo document.
    // Only its authenticated callback may write OS's durable receipt.
    const receipt = await call(`/api/core/projects/${encodeURIComponent(scope.liveProjectId)}/archive-commit`, {
      schemaVersion:"clara.live-archive-commit-request.v1", authorizationTicket:ticket,
      lifecycleRevision:authorization.lifecycleRevision, operation:"archive", osUserId:scope.osUserId,
      workspaceId:scope.workspaceId,clientId:scope.clientId,projectId:scope.projectId,
    }) as {state?:string;reference?:unknown};
    if (receipt.state !== "committed") throw new RegistryError(403,"LIVE_ARCHIVE_NOT_COMMITTED");
    const saved = parseLiveArchiveReference(receipt.reference);
    if (saved.workspaceId !== record.workspaceId || saved.clientId !== record.clientId ||
        saved.projectId !== record.projectId || saved.liveProjectId !== record.liveProjectId)
      throw new RegistryError(403,"LIVE_ARCHIVE_RECEIPT_MISMATCH");
    return saved;
  }
  async function read(context: RegistryContext, client: string, project: string) {
    const { scope,authorization } = await grant(context,client,project,"read");
    const saved = await authority.history(context,client,project);
    const record = saved ? parseLiveArchiveReference(saved) : reference(scope,authorization);
    verify(record,scope,authorization,"read");
    // Reopened Live projects retain OS history; current status is fetched fresh.
    await authority.current(context,client,project,"read");
    return { reference:saved, currentStatus:authorization.status, sourceUrl:authorization.sourceUrl,
      displayName:scope.projectName, archivable:authorization.status === "completed" && authorization.permissions.archive === true };
  }
  return { archive, read };
}
export const canonicalArchiveService = createCanonicalArchiveService();
