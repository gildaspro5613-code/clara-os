import { NextResponse } from "next/server";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import {
  SOUND_CONSOLE_PROVIDERS,
  type SoundConsoleProvider,
} from "@/lib/connectors/internal/sound/console-foundations";
import { ServerSoundConsoleConfigurationService } from "@/lib/connectors/internal/sound/configuration-server";

export const dynamic = "force-dynamic";

type RequestBody = {
  provider: SoundConsoleProvider;
  host: string;
  port?: number;
};

const SUPPORTED_PROVIDERS = new Set<string>(Object.values(SOUND_CONSOLE_PROVIDERS));

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

  return {
    provider: provider as SoundConsoleProvider,
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
      return NextResponse.json({ success: false, error: "Unauthorized external product." }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }

    const body = parseBody(rawBody);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid sound console configuration request." }, { status: 400 });
    }

    const configuration = await new ServerSoundConsoleConfigurationService().configure({
      workspaceId: product.workspaceId,
      ...body,
    });

    return NextResponse.json({ success: true, configuration });
  } catch (error) {
    if (error instanceof ExternalProductConfigurationError) {
      return NextResponse.json({ success: false, error: "External product gateway is not configured." }, { status: 503 });
    }
    if (error instanceof TypeError || error instanceof RangeError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("[API /external/sound/onboarding/configuration]", error);
    return NextResponse.json({ success: false, error: "Sound console configuration failed." }, { status: 500 });
  }
}
