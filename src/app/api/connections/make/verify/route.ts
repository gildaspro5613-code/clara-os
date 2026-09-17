import { NextResponse } from "next/server";

import { ConnectionStatus } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { MakeConnectorAdapter, MakeWebhookError } from "@/lib/connectors/make";

type VerifyMakeRequest = { scenarioKey?: unknown };

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

    const resolver = new ConnectionResolver(repository, credentialStore);
    const adapter = new MakeConnectorAdapter(resolver);

    await adapter.execute(connection.id, {
      capability: "make.scenario.execute",
      input: {
        scenarioKey,
        payload: {
          type: "clara.connection.verify",
          timestamp: new Date().toISOString(),
        },
      },
    });

    await repository.updateStatus(connection.id, ConnectionStatus.ACTIVE);
    return NextResponse.json({ provider: "make", connected: true, status: ConnectionStatus.ACTIVE });
  } catch (error) {
    const connection = await repository.findByWorkspaceAndProvider(CURRENT_WORKSPACE_ID, "make");
    if (connection) await repository.updateStatus(connection.id, ConnectionStatus.RECONNECT_REQUIRED);

    if (error instanceof MakeWebhookError) {
      return NextResponse.json(
        { error: error.code, retryable: error.retryable },
        { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 502 },
      );
    }
    return NextResponse.json({ error: "MAKE_VERIFICATION_FAILED" }, { status: 502 });
  }
}
