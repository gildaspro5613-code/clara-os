import { NextRequest, NextResponse } from "next/server";

import { OrganizationConnectorRepository } from "@/lib/runtime/organization-connector-repository";
import type { NativeConnectorId } from "@/lib/runtime/native-connector-resolver";

const CONNECTOR_IDS = new Set<NativeConnectorId>([
  "google.gmail",
  "google.calendar",
  "google.drive",
  "google.docs",
  "google.sheets",
  "microsoft.outlook",
  "microsoft.calendar",
  "openai.responses",
  "openai.audio",
  "elevenlabs.conversation",
]);

function organizationIdFrom(request: NextRequest): string | undefined {
  const value = request.nextUrl.searchParams.get("organizationId")?.trim();
  return value || undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const organizationId = organizationIdFrom(request);
  if (!organizationId) {
    return NextResponse.json({ success: false, error: "organizationId is required." }, { status: 400 });
  }

  try {
    const connectors = await new OrganizationConnectorRepository().list(organizationId);
    return NextResponse.json({ success: true, organizationId, connectors });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  const connectorId = typeof body.connectorId === "string" ? body.connectorId : "";
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;

  if (!organizationId || !CONNECTOR_IDS.has(connectorId as NativeConnectorId) || enabled === undefined) {
    return NextResponse.json(
      { success: false, error: "organizationId, known connectorId and enabled are required." },
      { status: 400 },
    );
  }

  const connectionRef =
    typeof body.connectionRef === "string" && body.connectionRef.trim()
      ? body.connectionRef.trim()
      : undefined;
  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : {};

  try {
    const connector = await new OrganizationConnectorRepository().upsert({
      organizationId,
      connectorId: connectorId as NativeConnectorId,
      enabled,
      connectionRef,
      metadata,
    });
    return NextResponse.json({ success: true, connector });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}
