import { NextResponse } from "next/server";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { toPublicBrevoConnection } from "@/lib/connections/brevo-connection-public";

export const dynamic = "force-dynamic";

export async function GET() {
  const connection = await new DatabaseConnectionRepository()
    .findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "brevo");
  return NextResponse.json(toPublicBrevoConnection(connection));
}
