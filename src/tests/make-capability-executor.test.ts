import assert from "node:assert/strict";
import test from "node:test";

import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionStatus } from "@/lib/connections/connection";
import { MakeCapabilityExecutor, type MakeExecutionAdapter } from "@/lib/capabilities/make/executor";
import { getAllowedMakeScenarioKeys, isMakeScenarioAllowed } from "@/lib/capabilities/make/scenario-catalog";
import { MAKE_CAPABILITIES } from "@/lib/connectors/make";

function repository(scopes: string[] = []): ConnectionRepository {
  return {
    async findById() {
      return null;
    },
    async findByWorkspaceAndProvider(workspaceId: string, provider: string) {
      assert.equal(workspaceId, "workspace-1");
      assert.equal(provider, "make");
      const now = new Date();
      return {
        id: "make-connection-1",
        workspaceId,
        provider,
        status: ConnectionStatus.ACTIVE,
        scopes,
        createdAt: now,
        updatedAt: now,
      };
    },
    async save() {},
    async updateStatus() {},
  };
}

test("scenario catalog is backward compatible until an explicit Make allowlist exists", () => {
  assert.equal(isMakeScenarioAllowed([], "notify-team"), true);
  assert.deepEqual([...getAllowedMakeScenarioKeys(["google:drive", "make:scenario:notify-team"])], ["notify-team"]);
  assert.equal(isMakeScenarioAllowed(["make:scenario:notify-team"], "notify-team"), true);
  assert.equal(isMakeScenarioAllowed(["make:scenario:notify-team"], "sync-crm"), false);
});

test("execute rejects a scenario outside the workspace allowlist before adapter execution", async () => {
  let called = false;
  const adapter: MakeExecutionAdapter = {
    async execute() {
      called = true;
      throw new Error("adapter should not execute");
    },
  };
  const executor = new MakeCapabilityExecutor(
    repository(["make:scenario:notify-team"]),
    () => adapter,
  );

  const result = await executor.execute(
    MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    "workspace-1",
    { scenarioKey: "sync-crm", payload: {} },
  );

  assert.equal(called, false);
  assert.equal(result.success, false);
  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "SCENARIO_NOT_ALLOWED");
});

test("execute returns provider-neutral accepted metadata for an authorized scenario", async () => {
  const adapter: MakeExecutionAdapter = {
    async execute(connectionId, request) {
      assert.equal(connectionId, "make-connection-1");
      assert.equal(request.capability, MAKE_CAPABILITIES.SCENARIO_EXECUTE);
      return {
        provider: "make",
        capability: request.capability,
        data: {
          ok: true,
          scenarioKey: "notify-team",
          status: 202,
          executionStatus: "accepted",
          executionId: "make-exec-42",
          data: { accepted: true },
        },
      };
    },
  };
  const executor = new MakeCapabilityExecutor(
    repository(["make:scenario:notify-team"]),
    () => adapter,
  );

  const result = await executor.execute(
    MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    "workspace-1",
    { scenarioKey: "notify-team", payload: { message: "hello" } },
  );

  assert.equal(result.success, true);
  assert.equal(result.provider, "make");
  assert.equal(result.connectionId, "make-connection-1");
  assert.equal(result.status, "accepted");
  assert.equal(result.executionId, "make-exec-42");
});
