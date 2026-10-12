import { canonicalArchiveService } from "@/lib/canonical/archive-service";
import { opaque, registryContext } from "@/lib/canonical/registry";
import { fields, registryBody, registryFailure, registrySuccess, sameOrigin } from "@/lib/canonical/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only existing OS sessions with explicit canonical ACL and fresh Live authority. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const context = registryContext(request.headers.get("cookie"), params.get("workspaceId"));
    return registrySuccess(await canonicalArchiveService.read(context,opaque(params.get("clientId")),opaque(params.get("projectId"))));
  } catch (error) { return registryFailure(error); }
}
export async function POST(request: Request) {
  try {
    registryContext(request.headers.get("cookie"), "session-selector");
    sameOrigin(request);
    const body = await registryBody(request);
    fields(body,["workspaceId","clientId","projectId"]);
    const context = registryContext(request.headers.get("cookie"),body.workspaceId);
    return registrySuccess(await canonicalArchiveService.archive(context,opaque(body.clientId),opaque(body.projectId)));
  } catch (error) { return registryFailure(error); }
}
