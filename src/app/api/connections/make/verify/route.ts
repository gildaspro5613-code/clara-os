import { NextResponse } from "next/server";

import { ConnectionStatus } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import type { MakeWebhookCredentials } from "@/lib/connectors/make";

type VerifyMakeRequest = { scenarioKey?: unknown };

function validScenarioKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,120}$/.test(value.trim());
}

function isMakeWebhookHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "make.com" || host.endsWith(".make.com") || host === "integromat.com" || host.endsWith(".integromat.com");
}

function isValidMakeWebhook(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && isMakeWebhookHost(url.hostname);
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
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (!validScenarioKey(body.scenarioKey)) {
    return NextResponse.json({ error: "INVALID_SCENARIO_KEY" }, { status: 400 });
  }
  const scenarioKey = body.scenarioKey.trim();

  const repository = new DatabaseConnectionRepository();
  const credentialStore = new CredentialStore();

  try {
    const connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "make");
    if (!connection) {
      return NextResponse.json({ error: "MAKE_NOT_CONFIGURED" }, { status: 404 });
    }

    if (!connection.scopes.includes(`make:scenario:${scenarioKey}`)) {
      return NextResponse.json({ error: "MAKE_SCENARIO_NOT_AUTHORIZED" }, { status: 403 });
    }

    const credentials = await credentialStore.get<MakeWebhookCredentials>(connection.id);
    const scenario = credentials?.scenarios?.[scenarioKey];

    if (!scenario) {
      return NextResponse.json({ error: "MAKE_SCENARIO_NOT_CONFIGURED" }, { status: 404 });
    }

    if (!isValidMakeWebhook(scenario.url)) {
      await repository.updateStatus(connection.id, ConnectionStatus.RECONNECT_REQUIRED);
      return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
    }

    await repository.updateStatus(connection.id, ConnectionStatus.ACTIVE);
    return NextResponse.json({
      provider: "make",
      connected: true,
      status: ConnectionStatus.ACTIVE,
      validation: "LOCAL_CONFIGURATION",
    });
  } catch {
    return NextResponse.json({ error: "MAKE_VALIDATION_FAILED" }, { status: 502 });
  }
}
