import { NextRequest, NextResponse } from "next/server";

import { OrganizationConnectorRepository } from "@/lib/runtime/organization-connector-repository";
import { isNativeConnectorId } from "@/lib/runtime/native-connector-resolver";
import { resolveOrganizationSession } from "@/lib/security/organization-session";

const SENSITIVE_KEY_PATTERN = /(token|secret|password|api[_-]?key|authorization|credential|private[_-]?key|access[_-]?key|refresh[_-]?token)/i;

function containsSensitiveData(value: unknown, key = ""): boolean {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return true;
  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveData(item));
  }

  return Object.entries(value as Record<string, unknown>).some(
    ([childKey, childValue]) => containsSensitiveData(childValue, childKey),
  );
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Authenticated organization session is required." },
    { status: 401 },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  let organizationId: string;
  try {
    const session = resolveOrganizationSession(request);
    if (!session) return unauthorized();
    organizationId = session.organizationId;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Session configuration error." },
      { status: 500 },
    );
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
  let organizationId: string;
  try {
    const session = resolveOrganizationSession(request);
    if (!session) return unauthorized();
    organizationId = session.organizationId;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Session configuration error." },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const connectorId = body.connectorId;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;

  if (!isNativeConnectorId(connectorId) || enabled === undefined) {
    return NextResponse.json(
      { success: false, error: "Known connectorId and enabled are required." },
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

  if (containsSensitiveData(metadata) || (connectionRef && SENSITIVE_KEY_PATTERN.test(connectionRef))) {
    return NextResponse.json(
      { success: false, error: "Secrets and credentials are not accepted by this endpoint." },
      { status: 400 },
    );
  }

  try {
    const connector = await new OrganizationConnectorRepository().upsert({
      organizationId,
      connectorId,
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
