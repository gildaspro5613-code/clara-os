import assert from "node:assert/strict";
import {
  authorizePhysicalExecution,
  type PhysicalExecutionDomain,
} from "../lib/connectors/clara-live/execution-authority";

const cases: Array<{
  domain: PhysicalExecutionDomain;
  connector: string;
  capability: string;
}> = [
  { domain: "LIGHT", connector: "chamsys_mq50", capability: "playback_level" },
  { domain: "SOUND", connector: "allenheath_sq", capability: "channel_level" },
  { domain: "SHOW_CONTROL", connector: "qlab", capability: "cue_go" },
  { domain: "SYSTEM", connector: "qsys", capability: "control_set" },
];

async function main(): Promise<void> {
  const previousBase = process.env.CLARA_LIVE_BASE_URL;
  const previousToken = process.env.CLARA_OS_PRODUCT_TOKEN;
  try {
    process.env.CLARA_LIVE_BASE_URL = "https://clara-live.example.test";
    process.env.CLARA_OS_PRODUCT_TOKEN = "test-secret";

    for (const item of cases) {
      let capturedInit: RequestInit | undefined;
      const receipt = await authorizePhysicalExecution({
        agentId: "agent-1",
        connector: item.connector,
        capability: item.capability,
        parameters: { test: true },
        sessionId: "session-1",
        domain: item.domain,
      }, async (_url, init) => {
        capturedInit = init;
        return new Response(JSON.stringify({
          command_id: `cmd-${item.domain}`,
          state: "QUEUED",
          phase: "EXECUTE",
          authorization_source: "clara-os",
        }), { status: 200, headers: { "content-type": "application/json" } });
      });

      assert.equal(receipt.phase, "EXECUTE");
      const payload = JSON.parse(String(capturedInit?.body));
      assert.equal(payload.domain, item.domain);
      assert.equal(payload.connector, item.connector);
      assert.equal(payload.capability, item.capability);
      assert.match(payload.execution_authorization_id, /^exec_/);
    }

    console.log("Universal physical execution domain contract: OK");
  } finally {
    if (previousBase === undefined) delete process.env.CLARA_LIVE_BASE_URL;
    else process.env.CLARA_LIVE_BASE_URL = previousBase;
    if (previousToken === undefined) delete process.env.CLARA_OS_PRODUCT_TOKEN;
    else process.env.CLARA_OS_PRODUCT_TOKEN = previousToken;
  }
}

void main();
