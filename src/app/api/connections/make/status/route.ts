import { NextResponse } from "next/server";

import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";

export const dynamic = "force-dynamic";

/**
 * Returns only non-sensitive Make connection metadata for the current workspace.
 * Credentials, webhook URLs and secret headers never leave the server-side store.
 */
export async function GET() {
  try {
    const repository = new DatabaseConnectionRepository();
    const connection = await repository.findByWorkspaceAndProvider(
      CURRENT_WORKSPACE_ID,
      "make",
    );

    if (!connection) {
      return NextResponse.json({
        provider: "make",
        connected: false,
        status: "NOT_CONFIGURED",
      });
    }

    return NextResponse.json({
      provider: "make",
      connected: connection.status === "ACTIVE",
      status: connection.status,
      updatedAt: connection.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        provider: "make",
        connected: false,
        status: "UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
