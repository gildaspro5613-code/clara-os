import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import { MakeConnectorAdapter, MAKE_CAPABILITIES } from "@/lib/connectors/make";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!process.env.CLARA_CREDENTIALS_ENCRYPTION_KEY) {
    throw new Error("CLARA_CREDENTIALS_ENCRYPTION_KEY is required.");
  }

  const connections = new DatabaseConnectionRepository();
  const credentials = new CredentialStore();
  const connection = await connections.findByWorkspaceAndProvider(
    CURRENT_WORKSPACE_ID,
    "make",
  );
  if (!connection) throw new Error("No Make connection found for the current workspace.");

  const resolver = new ConnectionResolver(connections, credentials);
  const adapter = new MakeConnectorAdapter(resolver);

  const result = await adapter.execute(connection.id, {
    capability: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    input: {
      scenarioKey: "find-drive-document",
      payload: {
        workspaceId: CURRENT_WORKSPACE_ID,
        query: "TEST Clara",
      },
    },
  });

  console.log("Make MCP read-only smoke test completed.");
  console.dir(result, { depth: 8 });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Make MCP smoke test failed: ${message}`);
  process.exitCode = 1;
});
