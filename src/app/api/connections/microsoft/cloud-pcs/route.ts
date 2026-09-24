import { NextResponse, type NextRequest } from "next/server";
import { authenticatedMicrosoftWorkspace } from "@/lib/connectors/microsoft/security/authenticated-microsoft-workspace";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { OAuthRefreshService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { MicrosoftGraphClient } from "@/lib/connectors/microsoft/graph/microsoft-graph-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const workspace = await authenticatedMicrosoftWorkspace(request.headers.get("cookie"), "connections:read");
  if (!workspace) return NextResponse.json({ error: "MICROSOFT_WORKSPACE_AUTH_REQUIRED" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const repository = new DatabaseConnectionRepository();
    const connection = await repository.findByWorkspaceAndProvider(workspace.workspaceId, "microsoft");
    if (!connection) return NextResponse.json({ success: false, message: "Microsoft is not connected." }, { status: 404 });
    const credentials = await new OAuthRefreshService(oauthProviders, repository, new CredentialStore()).refreshIfNeeded(connection.id, "microsoft");
    const graph = new MicrosoftGraphClient(credentials.accessToken);
    const [user, cloudPcs] = await Promise.all([graph.getCurrentUser(), graph.listCloudPcs()]);
    return NextResponse.json({ success: true, user, cloudPcs }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "MICROSOFT_GRAPH_UNAVAILABLE" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
