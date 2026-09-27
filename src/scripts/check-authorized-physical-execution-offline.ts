import assert from "node:assert/strict";
import { executeAuthorizedPhysicalAction } from "@/lib/connectors/clara-live/execute-authorized-physical-action";
import type { AuthorizedPhysicalAction } from "@/lib/connectors/clara-live/physical-action";

async function main() {
  process.env.CLARA_LIVE_BASE_URL = "https://clara-live.invalid";
  process.env.CLARA_OS_PRODUCT_TOKEN = "offline-test-token";

  let calls = 0;
  const transport = async (_url: string, init: RequestInit) => {
    calls += 1;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    assert.equal(body.phase, "EXECUTE");
    assert.equal(typeof body.execution_authorization_id, "string");
    return new Response(JSON.stringify({
      command_id: "offline-command",
      state: "QUEUED",
      phase: "EXECUTE",
      authorization_source: "clara-os",
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const action: AuthorizedPhysicalAction = {
    id: "proposal-offline",
    taskId: "task-offline",
    agentId: "agent-offline",
    connector: "lighting-test",
    capability: "set-level",
    parameters: { level: 37 },
    sessionId: "session-offline",
    status: "AUTHORIZED",
    proposedAt: new Date(),
    authorizedAt: new Date(),
    authorizedBy: "operator-offline",
  };

  const context = {
    brain: {} as never,
    experiences: [],
    recommendations: [],
    configuration: {},
    createdAt: new Date(),
  };

  const result = await executeAuthorizedPhysicalAction(action, context, transport);
  assert.equal(calls, 1);
  assert.equal(result.success, true);
  const receipt = result.data as { state?: string; phase?: string };
  assert.equal(receipt.state, "QUEUED");
  assert.equal(receipt.phase, "EXECUTE");
  console.log("Authorized physical execution offline contract: OK");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
