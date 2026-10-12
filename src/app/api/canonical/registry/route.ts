import { canonicalRegistry, name, opaque, registryContext, RegistryError } from "@/lib/canonical/registry";
import { verifyLiveCanonicalProof } from "@/lib/canonical/live-bridge";
import { fields, registryBody, registryFailure, registrySuccess, sameOrigin } from "@/lib/canonical/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Administrative foundation using existing OS authentication, not a login. */
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await registryBody(request);
    const context = registryContext(request.headers.get("cookie"), body.workspaceId);
    const action = opaque(body.action);
    let payload: Record<string, unknown> = {};
    const base = ["action", "workspaceId"];
    if (action === "list" || action === "listProjects") {
      fields(body, [...base,"after","limit",...(action === "listProjects" ? ["clientId"] : [])]);
      if (body.limit !== undefined && (!Number.isInteger(body.limit) || Number(body.limit) < 1 || Number(body.limit) > 100)) throw new RegistryError(400, "INVALID_REGISTRY_LIMIT");
      payload = { after: body.after === undefined ? "" : opaque(body.after), limit: body.limit ?? 50, ...(action === "listProjects" ? { clientId: opaque(body.clientId) } : {}) };
    } else if (action === "createClient") {
      fields(body, [...base,"id","displayName"]);
      payload = { id: opaque(body.id), displayName: name(body.displayName) };
    } else if (action === "createProject") {
      fields(body, [...base,"clientId","projectId","displayName"]);
      payload = { clientId: opaque(body.clientId), projectId: opaque(body.projectId), displayName: name(body.displayName) };
    } else if (action === "grantClient" || action === "grantProject") {
      fields(body, [...base,"clientId",...(action === "grantProject" ? ["projectId"] : []),"userId","read","archive","manage"]);
      for (const permission of ["read","archive","manage"]) if (typeof body[permission] !== "boolean") throw new RegistryError(400, "EXPLICIT_REGISTRY_PERMISSIONS_REQUIRED");
      payload = { clientId: opaque(body.clientId), userId: opaque(body.userId), read: body.read, archive: body.archive, manage: body.manage,
        ...(action === "grantProject" ? { projectId: opaque(body.projectId) } : {}) };
    } else if (action === "revokeClient") {
      fields(body, [...base,"clientId"]); payload = { clientId: opaque(body.clientId) };
    } else if (action === "revokeProject" || action === "revokeProjectLink") {
      fields(body, [...base,"clientId","projectId"]); payload = { clientId: opaque(body.clientId), projectId: opaque(body.projectId) };
    } else if (action === "beginIdentityLink") {
      fields(body, base); return registrySuccess(await canonicalRegistry.begin(context, "identity", {}));
    } else if (action === "beginProjectLink") {
      fields(body, [...base,"clientId","projectId"]);
      return registrySuccess(await canonicalRegistry.begin(context, "project", { clientId: opaque(body.clientId), projectId: opaque(body.projectId) }));
    } else if (action === "challenge") {
      fields(body, [...base,"challengeId"]);
      const candidate = await canonicalRegistry.candidate(context, opaque(body.challengeId));
      return registrySuccess({ id: candidate.id, kind: candidate.kind, proofId: candidate.proofId, liveUserId: candidate.liveUserId, liveProjectId: candidate.liveProjectId, consumed: candidate.consumed });
    } else if (action === "confirmLink") {
      fields(body, [...base,"challengeId","approve"]);
      if (body.approve !== true) throw new RegistryError(400, "EXPLICIT_OS_CONSENT_REQUIRED");
      return registrySuccess(await canonicalRegistry.confirm(context, opaque(body.challengeId), verifyLiveCanonicalProof));
    } else if (action === "revokeIdentityLink") {
      fields(body, base);
    } else throw new RegistryError(400, "UNKNOWN_REGISTRY_ACTION");
    return registrySuccess(await canonicalRegistry.command(context, action, payload));
  } catch (error) { return registryFailure(error); }
}

export async function GET(request: Request) {
  try {
    const context = registryContext(request.headers.get("cookie"), "workspace-selector");
    return registrySuccess(await canonicalRegistry.workspaces(context.digest));
  } catch (error) { return registryFailure(error); }
}
