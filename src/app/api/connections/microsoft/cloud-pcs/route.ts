import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { OAuthRefreshService } from "@/lib/auth/oauth/service";
import { oauthProviders } from "@/lib/auth/oauth/providers";
import { MicrosoftGraphClient } from "@/lib/connectors/microsoft/graph/microsoft-graph-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const repository = new DatabaseConnectionRepository();
  const connection = await repository.findByWorkspaceAndProvider(
    CURRENT_WORKSPACE_ID,
    "microsoft",
  );

  if (!connection) {
    return NextResponse.json(
      { success: false, message: "Microsoft is not connected." },
      { status: 404 },
    );
  }

  const credentialStore = new CredentialStore();
  const credentials = await new OAuthRefreshService(
    oauthProviders,
    repository,
    credentialStore,
  ).refreshIfNeeded(connection.id, "microsoft");

  const graph = new MicrosoftGraphClient(credentials.accessToken);
  const [user, cloudPcs] = await Promise.all([
    graph.getCurrentUser(),
    graph.listCloudPcs(),
  ]);

  return NextResponse.json({
    success: true,
    user,
    cloudPcs,
  });
}
