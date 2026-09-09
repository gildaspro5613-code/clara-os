import assert from "node:assert/strict";
import test from "node:test";

import { NOTIFY_TEAM_CAPABILITY_ID } from "@/lib/capabilities/notify-team/capability";
import {
  executeNotifyTeamCapability,
  NOTIFY_TEAM_SCENARIO_KEY,
  type MakeScenarioExecutor,
} from "@/lib/capabilities/notify-team/executor";
import { MAKE_CAPABILITIES } from "@/lib/connectors/make";

test("notify-team hides Make implementation behind a semantic Clara capability", async () => {
  const calls: Array<{ capabilityId: string; workspaceId?: string; context: unknown }> = [];
  const makeExecutor: MakeScenarioExecutor = {
    async execute(capabilityId, workspaceId, context) {
      calls.push({ capabilityId, workspaceId, context });
      return {
        capabilityId,
        success: true,
        provider: "make",
        connectionId: "connection-1",
        status: "accepted",
        executionId: "exec-1",
        data: { accepted: true },
      };
    },
  };

  const result = await executeNotifyTeamCapability(
    makeExecutor,
    "workspace-1",
    { message: "  Deployment ready  ", title: "Release", urgency: "high" },
  );

  assert.equal(result.capabilityId, NOTIFY_TEAM_CAPABILITY_ID);
  assert.equal(result.provider, "make");
  assert.equal(result.status, "accepted");
  assert.equal(result.executionId, "exec-1");
  assert.deepEqual(calls, [{
    capabilityId: MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    workspaceId: "workspace-1",
    context: {
      scenarioKey: NOTIFY_TEAM_SCENARIO_KEY,
      payload: { message: "Deployment ready", title: "Release", urgency: "high" },
    },
  }]);
});

test("notify-team rejects an empty message before Make execution", async () => {
  let called = false;
  const makeExecutor: MakeScenarioExecutor = {
    async execute() {
      called = true;
      throw new Error("Make should not be called");
    },
  };

  const result = await executeNotifyTeamCapability(makeExecutor, "workspace-1", { message: "   " });

  assert.equal(called, false);
  assert.equal(result.success, false);
  assert.equal(result.capabilityId, NOTIFY_TEAM_CAPABILITY_ID);
  assert.equal(result.error?.code, "INVALID_INPUT");
});
