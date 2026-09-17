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
const MAX_HEADERS = 32;

function validScenarioKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,120}$/.test(value.trim());
}

function isMakeWebhookHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "make.com" || host.endsWith(".make.com") || host === "integromat.com" || host.endsWith(".integromat.com");
}

function normalizeWebhookUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 2048) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search || !isMakeWebhookHost(url.hostname) || url.pathname.length <= 1) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function scenarioMap(value: MakeWebhookCredentials | null): MakeWebhookCredentials["scenarios"] {
  if (!value || typeof value.scenarios !== "object" || value.scenarios === null || Array.isArray(value.scenarios)) return {};
  const scenarios: MakeWebhookCredentials["scenarios"] = {};
  for (const [key, scenario] of Object.entries(value.scenarios)) {
    const url = scenario && typeof scenario === "object" ? normalizeWebhookUrl(scenario.url) : null;
    if (!validScenarioKey(key) || !url) continue;
    const headerEntries = scenario.headers && typeof scenario.headers === "object" && !Array.isArray(scenario.headers)
      ? Object.entries(scenario.headers)
          .filter(([name, headerValue]) => name.length <= 128 && typeof headerValue === "string" && headerValue.length <= 4096)
          .slice(0, MAX_HEADERS)
      : [];
    const headers = headerEntries.length ? Object.fromEntries(headerEntries) : undefined;
    scenarios[key] = {
      url,
      ...(headers ? { headers } : {}),
      ...(typeof scenario.timeoutMs === "number" ? { timeoutMs: scenario.timeoutMs } : {}),
    };
  }
  return scenarios;
}

export async function POST(request: Request) {
  let body: ConfigureMakeRequest;
  try {
    body = (await request.json()) as ConfigureMakeRequest;
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const webhookUrl = normalizeWebhookUrl(body.webhookUrl);
  if (!validScenarioKey(body.scenarioKey) || !webhookUrl) {
    return NextResponse.json({ error: "INVALID_CONFIGURATION" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const scenarioKey = body.scenarioKey.trim();

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
    const previousScenarios = scenarioMap(previousCredentials);

    if (!(scenarioKey in previousScenarios) && Object.keys(previousScenarios).length >= MAX_SCENARIOS) {
      return NextResponse.json({ error: "SCENARIO_LIMIT_REACHED" }, { status: 409, headers: PRIVATE_HEADERS });
    }

    const credentials: MakeWebhookCredentials = {
      scenarios: {
        ...previousScenarios,
        [scenarioKey]: { url: webhookUrl },
      },
    };

    const scopes = new Set(connection.scopes.filter((scope) => !scope.startsWith("make:scenario:")));
    for (const key of Object.keys(credentials.scenarios)) scopes.add(`make:scenario:${key}`);

    await credentialStore.set(connection.id, credentials);
    try {
      await repository.save({
        ...connection,
        status: ConnectionStatus.CONFIGURED,
        scopes: [...scopes],
        updatedAt: now,
      });
    } catch (error) {
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
