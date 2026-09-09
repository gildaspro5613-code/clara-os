import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import type { MakeWebhookCredentials } from "@/lib/connectors/make";

const DEFAULT_TOOL_MAP: Record<string, string> = {
  "notify-team": "CLARA – Notify Team",
  "sync-brevo-contact": "CLARA – Sync Brevo Contact",
  "archive-document": "CLARA – Archive Document",
  "create-calendar-event": "CLARA – Create Calendar Event",
  "find-drive-document": "CLARA – Find Drive Document",
  "check-calendar-availability": "CLARA – Check Calendar Availability",
  "search-calendar-events": "CLARA – Search Calendar Events",
  "create-drive-folder": "CLARA – Create Drive Folder",
  "move-drive-document": "CLARA – Move Drive Document",
};

const DEFAULT_SCOPES = Object.keys(DEFAULT_TOOL_MAP).map(
  (scenarioKey) => `make:scenario:${scenarioKey}`,
);

function assertMcpUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== "https:") {
    throw new Error("The Make MCP URL must use HTTPS.");
  }
  if (!url.pathname.endsWith("/stateless")) {
    throw new Error("Use the Make stateless MCP endpoint ending in /stateless.");
  }
  return url.toString();
}

async function readSecret(prompt: string): Promise<string> {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    const rl = createInterface({ input, output });
    try {
      return (await rl.question(prompt)).trim();
    } finally {
      rl.close();
    }
  }

  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding("utf8");

  return await new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");
    };

    const onData = (chunk: string) => {
      if (chunk === "\u0003") {
        cleanup();
        reject(new Error("Cancelled."));
        return;
      }
      if (chunk === "\r" || chunk === "\n") {
        cleanup();
        resolve(value.trim());
        return;
      }
      if (chunk === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += chunk;
    };

    input.on("data", onData);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to persist the production Make connection.");
  }
  if (!process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY) {
    throw new Error(
      "CLARA_CREDENTIALS_ENCRYPTION_KEY is required so the MCP credential can be encrypted at rest.",
    );
  }

  const rl = createInterface({ input, output });
  let workspaceId = CURRENT_WORKSPACE_ID;
  let urlValue = "";
  try {
    workspaceId = (await rl.question(
      `Workspace id [${CURRENT_WORKSPACE_ID}]: `,
    )).trim() || CURRENT_WORKSPACE_ID;
    urlValue = await rl.question("Make MCP stateless URL: ");
  } finally {
    rl.close();
  }

  const url = assertMcpUrl(urlValue);
  const bearerToken = await readSecret("Make MCP key (hidden): ");
  if (!bearerToken) throw new Error("The Make MCP key is required.");

  const connections = new DatabaseConnectionRepository();
  const credentials = new CredentialStore();
  const existing = await connections.findByWorkspaceAndProvider(workspaceId, "make");
  const now = new Date();

  const connection: Connection = existing
    ? {
        ...existing,
        status: ConnectionStatus.ACTIVE,
        scopes: Array.from(new Set([...existing.scopes, ...DEFAULT_SCOPES])),
        updatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        workspaceId,
        provider: "make",
        status: ConnectionStatus.ACTIVE,
        scopes: DEFAULT_SCOPES,
        createdAt: now,
        updatedAt: now,
      };

  await connections.save(connection);

  const previous = existing
    ? await credentials.get<MakeWebhookCredentials>(connection.id)
    : null;

  const nextCredentials: MakeWebhookCredentials = {
    scenarios: previous?.scenarios ?? {},
    mcp: {
      url,
      bearerToken,
      tools: {
        ...DEFAULT_TOOL_MAP,
        ...(previous?.mcp?.tools ?? {}),
      },
      timeoutMs: previous?.mcp?.timeoutMs ?? 30_000,
    },
  };

  await credentials.set(connection.id, nextCredentials);

  output.write(
    `Make MCP configured for workspace ${workspaceId}. Connection ${connection.id} is ACTIVE.\n`,
  );
  output.write(
    "The MCP URL and key are now stored encrypted in Clara OS CredentialStore; no secret was written to GitHub.\n",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Make MCP configuration failed: ${message}`);
  process.exitCode = 1;
});
