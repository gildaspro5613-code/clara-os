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

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };
const MAX_SCENARIOS = 100;

function validScenarioKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,120}$/.test(value.trim());
}

function isMakeWebhookHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "make.com" || host.endsWith(".make.com") || host === "integromat.com" || host.endsWith(".integromat.com");
}

function validWebhookUrl(value: unknown): value is string {
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

export async function POST(request: Request) {
  let body: ConfigureMakeRequest;
  try {
    body = (await request.json()) as ConfigureMakeRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  if (!validScenarioKey(body.scenarioKey) || !validWebhookUrl(body.webhookUrl)) {
    return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400, headers: PRIVATE_HEADERS });
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
    const previousScenarios = previousCredentials?.scenarios ?? {};

    if (!(scenarioKey in previousScenarios) && Object.keys(previousScenarios).length >= MAX_SCENARIOS) {
      return NextResponse.json({ error: "SCENARIO_LIMIT_REACHED" }, { status: 409, headers: PRIVATE_HEADERS });
    }

    const credentials: MakeWebhookCredentials = {
      scenarios: {
        ...previousScenarios,
        [scenarioKey]: { url: webhookUrl },
      },
    };

    const scopes = new Set(connection.scopes);
    scopes.add(`make:scenario:${scenarioKey}`);

    await credentialStore.set(connection.id, credentials);
    try {
      await repository.save({
        ...connection,
        status: ConnectionStatus.CONFIGURED,
        scopes: [...scopes],
        updatedAt: now,
      });
    } catch (error) {
      // Restore the previous encrypted value when updating an existing connection.
      // A newly allocated orphan credential is unreachable because no connection
      // metadata was persisted for its random id.
      if (existing && previousCredentials) {
        await credentialStore.set(connection.id, previousCredentials).catch(() => undefined);
      }
      throw error;
    }

    return NextResponse.json({
      provider: "make",
      connected: false,
      status: ConnectionStatus.CONFIGURED,
      scenarioKey,
    }, { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ error: "CONFIGURATION_UNAVAILABLE" }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
