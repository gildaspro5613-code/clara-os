import { NextResponse, type NextRequest } from "next/server";
import { authenticatedMicrosoftWorkspace } from "@/lib/connectors/microsoft/security/authenticated-microsoft-workspace";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { toPublicMicrosoftConnection } from "@/lib/connections/microsoft-connection-public";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const workspace = await authenticatedMicrosoftWorkspace(
    request.headers.get("cookie"),
    "connections:read",
  );
  if (!workspace) {
    return NextResponse.json(
      { error: "MICROSOFT_WORKSPACE_AUTH_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const connection = await new DatabaseConnectionRepository()
      .findByWorkspaceAndProvider(workspace.workspaceId, "microsoft");
    return NextResponse.json(toPublicMicrosoftConnection(connection), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "MICROSOFT_CONNECTION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
