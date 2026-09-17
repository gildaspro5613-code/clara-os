import { NextResponse } from "next/server";

import { ConnectionStatus } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import type { MakeWebhookCredentials } from "@/lib/connectors/make";

type VerifyMakeRequest = { scenarioKey?: unknown };

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

function validScenarioKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,120}$/.test(value.trim());
}

function isMakeWebhookHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "make.com" || host.endsWith(".make.com") || host === "integromat.com" || host.endsWith(".integromat.com");
}

function isValidMakeWebhook(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate || candidate.length > 2048) return false;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.search && isMakeWebhookHost(url.hostname) && url.pathname.length > 1;
  } catch {
    return false;
  }
}

/**
 * Validates the local Make connection configuration only.
 *
 * This route deliberately does not call a Make webhook: configuration validation
 * must never trigger an automation or other business side effect. Real provider
 * execution remains the responsibility of the Make capability execution path.
 */
export async function POST(request: Request) {
  let body: VerifyMakeRequest;
  try {
    body = (await request.json()) as VerifyMakeRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  if (!validScenarioKey(body.scenarioKey)) {
    return NextResponse.json({ error: "INVALID_SCENARIO_KEY" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const scenarioKey = body.scenarioKey.trim();

  const repository = new DatabaseConnectionRepository();
  const credentialStore = new CredentialStore();

  try {
    const connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "make");
    if (!connection) {
      return NextResponse.json({ error: "MAKE_NOT_CONFIGURED" }, { status: 404, headers: PRIVATE_HEADERS });
    }

    if (!connection.scopes.includes(`make:scenario:${scenarioKey}`)) {
      return NextResponse.json({ error: "MAKE_SCENARIO_NOT_AUTHORIZED" }, { status: 403, headers: PRIVATE_HEADERS });
    }

    const credentials = await credentialStore.get<MakeWebhookCredentials>(connection.id);
    const scenarios = credentials && typeof credentials.scenarios === "object" && credentials.scenarios !== null && !Array.isArray(credentials.scenarios)
      ? credentials.scenarios
      : {};
    const scenario = scenarios[scenarioKey];

    if (!scenario || typeof scenario !== "object" || !isValidMakeWebhook(scenario.url)) {
      await repository.updateStatus(connection.id, ConnectionStatus.RECONNECT_REQUIRED);
      return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400, headers: PRIVATE_HEADERS });
    }

    await repository.updateStatus(connection.id, ConnectionStatus.ACTIVE);
    return NextResponse.json({
      provider: "make",
      connected: true,
      status: ConnectionStatus.ACTIVE,
      validation: "LOCAL_CONFIGURATION",
    }, { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ error: "MAKE_VALIDATION_FAILED" }, { status: 502, headers: PRIVATE_HEADERS });
  }
}
