import { NextResponse } from "next/server";

import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import type { MakeWebhookCredentials } from "@/lib/connectors/make";

type ConfigureMakeRequest = {
  scenarioKey?: unknown;
  webhookUrl?: unknown;
};

function validScenarioKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,120}$/.test(value.trim());
}

function validWebhookUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: ConfigureMakeRequest;
  try {
    body = (await request.json()) as ConfigureMakeRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (!validScenarioKey(body.scenarioKey) || !validWebhookUrl(body.webhookUrl)) {
    return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400 });
  }

  const scenarioKey = body.scenarioKey.trim();
  const webhookUrl = body.webhookUrl.trim();

  try {
    const repository = new DatabaseConnectionRepository();
    const credentialStore = new CredentialStore();
    const existing = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "make");
    const now = new Date();

    const connection: Connection = existing ?? {
      id: crypto.randomUUID(),
      workspaceId: CURRENT_WORKSPACE_ID,
      provider: "make",
      status: ConnectionStatus.CONFIGURED,
      scopes: [],
      createdAt: now,
      updatedAt: now,
    };

    const previousCredentials = existing
      ? await credentialStore.get<MakeWebhookCredentials>(connection.id)
      : null;

    const credentials: MakeWebhookCredentials = {
      scenarios: {
        ...(previousCredentials?.scenarios ?? {}),
        [scenarioKey]: { url: webhookUrl },
      },
    };

    const scopes = new Set(connection.scopes);
    scopes.add(`make:scenario:${scenarioKey}`);

    // Persist the encrypted secret first. If this fails, the public connection
    // metadata must not claim that a configuration exists without credentials.
    await credentialStore.set(connection.id, credentials);
    await repository.save({
      ...connection,
      status: ConnectionStatus.CONFIGURED,
      scopes: [...scopes],
      updatedAt: now,
    });

    return NextResponse.json({
      provider: "make",
      connected: false,
      status: ConnectionStatus.CONFIGURED,
      scenarioKey,
    });
  } catch {
    return NextResponse.json({ error: "CONFIGURATION_UNAVAILABLE" }, { status: 503 });
  }
}
