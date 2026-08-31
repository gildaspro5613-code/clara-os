import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { toPublicGoogleConnection } from "@/lib/connections/google-connection-public";

export const dynamic = "force-dynamic";

export async function GET() {
  const connection = await new DatabaseConnectionRepository()
    .findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "google");
  return NextResponse.json(toPublicGoogleConnection(connection));
}
