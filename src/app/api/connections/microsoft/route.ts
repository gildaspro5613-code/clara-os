import { microsoftWorkspaceGate } from "@/lib/connectors/microsoft/security/workspace-gate";
import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { toPublicMicrosoftConnection } from "@/lib/connections/microsoft-connection-public";

export const dynamic = "force-dynamic";

export async function GET() {
  return microsoftWorkspaceGate();

  /* Pending authenticated workspace resolver:

  const connection = await new DatabaseConnectionRepository()
    .findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "microsoft");
  return NextResponse.json(toPublicMicrosoftConnection(connection));
  */
}
