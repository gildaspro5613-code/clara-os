import { NextResponse } from "next/server";
import {
  authenticateExternalProduct,
  ExternalProductConfigurationError,
} from "@/lib/external-capabilities/config";
import {
  LightingConsoleOnboardingReadinessError,
} from "@/lib/connectors/internal/lighting-console-onboarding";
import {
  ServerLightingConsoleOnboardingSessionService,
} from "@/lib/connectors/internal/lighting-console-onboarding-server";
import type {
  LightingConsoleSessionMode,
} from "@/lib/connectors/internal/lighting-console-onboarding-session";
import type {
  LightingConsoleTestModeScenario,
} from "@/lib/connectors/internal/lighting-console-test-mode";

export const dynamic = "force-dynamic";

type RequestBody = {
  connectionId: string;
  mode: LightingConsoleSessionMode;
  scenario?: LightingConsoleTestModeScenario;
  simulatedFixtureDiscoveryCount?: number;
};

function parseBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const connectionId = typeof body.connectionId === "string" ? body.connectionId.trim() : "";
  const mode = body.mode;
  if (!connectionId || (mode !== "LIVE_READINESS" && mode !== "SIMULATION")) return null;

  const scenario = body.scenario;
  if (
    scenario !== undefined
    && scenario !== "SUCCESS"
    && scenario !== "CONNECTION_FAILURE"
    && scenario !== "NO_FIXTURES"
  ) return null;

  const simulatedFixtureDiscoveryCount = body.simulatedFixtureDiscoveryCount;
  if (
    simulatedFixtureDiscoveryCount !== undefined
    && (!Number.isInteger(simulatedFixtureDiscoveryCount) || (simulatedFixtureDiscoveryCount as number) < 0)
  ) return null;

  return {
    connectionId,
    mode,
    scenario: scenario as LightingConsoleTestModeScenario | undefined,
    simulatedFixtureDiscoveryCount: simulatedFixtureDiscoveryCount as number | undefined,
  };
}

function readinessErrorStatus(error: LightingConsoleOnboardingReadinessError): number {
  switch (error.code) {
    case "CONNECTION_NOT_FOUND":
      return 404;
    case "CONNECTION_WORKSPACE_MISMATCH":
      return 403;
    case "CONNECTION_INACTIVE":
      return 409;
    case "PROVIDER_NOT_SUPPORTED":
      return 422;
    case "CONFIGURATION_NOT_FOUND":
      return 409;
  }
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
        { success: false, error: "Invalid lighting onboarding session request." },
        { status: 400 },
      );
    }

    const session = await new ServerLightingConsoleOnboardingSessionService().run({
      workspaceId: product.workspaceId,
      ...body,
    });
    return NextResponse.json({ success: true, session });
  } catch (error) {
    if (error instanceof LightingConsoleOnboardingReadinessError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: readinessErrorStatus(error) },
      );
    }
    if (error instanceof ExternalProductConfigurationError) {
      console.error("[API /external/lighting/onboarding/session] configuration error", error.message);
      return NextResponse.json(
        { success: false, error: "External product gateway is not configured." },
        { status: 503 },
      );
    }
    console.error("[API /external/lighting/onboarding/session]", error);
    return NextResponse.json(
      { success: false, error: "Lighting onboarding session failed." },
      { status: 500 },
    );
  }
}
