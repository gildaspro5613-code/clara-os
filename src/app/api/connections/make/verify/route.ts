import { NextResponse } from "next/server";

import { ConnectionStatus } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import type { MakeWebhookCredentials } from "@/lib/connectors/make";

type VerifyMakeRequest = { scenarioKey?: unknown };

function isHttpsWebhook(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
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

  const scenarioKey = typeof body.scenarioKey === "string" ? body.scenarioKey.trim() : "";
  if (!scenarioKey) {
    return NextResponse.json({ error: "SCENARIO_KEY_REQUIRED" }, { status: 400 });
  }

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

    if (!isHttpsWebhook(scenario.url)) {
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
