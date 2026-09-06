import { NextResponse } from "next/server";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import {
  ServerLightingConsoleConfigurationService,
  type SupportedLightingConsoleProvider,
} from "@/lib/connectors/internal/lighting-console-configuration-server";
import { MAGICQ_CONNECTION_PROVIDER } from "@/lib/connectors/internal/chamsys/magicq";
import { GRANDMA3_CONNECTOR_ID } from "@/lib/connectors/internal/ma-lighting/grandma3";
import { AVOLITES_TITAN_CONNECTOR_ID } from "@/lib/connectors/internal/avolites/titan";

export const dynamic = "force-dynamic";

type RequestBody = {
  provider: SupportedLightingConsoleProvider;
  host: string;
  port?: number;
};

const SUPPORTED_PROVIDERS = new Set<string>([
  MAGICQ_CONNECTION_PROVIDER,
  GRANDMA3_CONNECTOR_ID,
  AVOLITES_TITAN_CONNECTOR_ID,
]);

function parseBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const host = typeof body.host === "string" ? body.host.trim() : "";
  const port = body.port;

  if (!SUPPORTED_PROVIDERS.has(provider) || !host) return null;
  if (port !== undefined && (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535)) {
    return null;
  }
  if (provider === GRANDMA3_CONNECTOR_ID && port === undefined) return null;

  return {
    provider: provider as SupportedLightingConsoleProvider,
    host,
    port: port as number | undefined,
  };
}

export async function POST(request: Request) {
  try {
    const product = authenticateExternalProduct(
      request.headers.get("x-clara-product"),
      request.headers.get("authorization"),
    );
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Unauthorized external product." },
        { status: 401 },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const body = parseBody(rawBody);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid lighting console configuration request." },
        { status: 400 },
      );
    }

    const configuration = await new ServerLightingConsoleConfigurationService().configure({
      workspaceId: product.workspaceId,
      ...body,
    });

    return NextResponse.json({ success: true, configuration });
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      console.error("[API /external/lighting/onboarding/configuration] configuration error", error.message);
      return NextResponse.json(
        { success: false, error: "External product gateway is not configured." },
        { status: 503 },
      );
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    console.error("[API /external/lighting/onboarding/configuration]", error);
    return NextResponse.json(
      { success: false, error: "Lighting console configuration failed." },
      { status: 500 },
    );
  }
}
