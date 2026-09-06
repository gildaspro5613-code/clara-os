import assert from "node:assert/strict";
import test from "node:test";

import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { LightingConsoleSelfServiceOnboardingPlanner } from "@/lib/connectors/internal/lighting-console-onboarding";
import { LightingConsoleTestModeRunner } from "@/lib/connectors/internal/lighting-console-test-mode";

function connectionRepository(provider: string): ConnectionRepository {
  return {
    async findById(id) {
      return {
        id,
        workspaceId: "workspace-1",
        provider,
        status: ConnectionStatus.ACTIVE,
        scopes: [],
        createdAt: new Date(0),
        updatedAt: new Date(0),
      };
    },
    async findByWorkspaceAndProvider() { return null; },
    async save() {},
    async updateStatus() {},
  };
}

function planner(provider: string) {
  return new LightingConsoleSelfServiceOnboardingPlanner(
    connectionRepository(provider),
    { async findByConnectionId() {
      return { host: "192.0.2.20", fixtureChannels: { wash: 17, beam: 18 } };
    } },
    { async findByConnectionId() {
      return { host: "192.0.2.30", port: 9000, fixtureNumbers: { wash: 42, beam: 43 } };
    } },
    { async findByConnectionId() { return { host: "192.0.2.50" }; } },
  );
}

test("MagicQ test mode simulates full connection path without network or certification", async () => {
  const runner = new LightingConsoleTestModeRunner(planner("chamsys.magicq"));
  const result = await runner.run({ workspaceId: "workspace-1", connectionId: "magicq-1" });
  assert.equal(result.mode, "SIMULATION");
  assert.equal(result.state, "SIMULATED_READY_FOR_FIXTURE_MAPPING");
  assert.equal(result.simulatedFixtureDiscoveryCount, 2);
  assert.equal(result.networkTouched, false);
  assert.equal(result.physicalCertificationGranted, false);
  assert.equal(result.writeCapabilitiesEnabled, false);
});

test("grandMA3 test mode can simulate a connection failure", async () => {
  const runner = new LightingConsoleTestModeRunner(planner("ma-lighting.grandma3"));
  const result = await runner.run({
    workspaceId: "workspace-1",
    connectionId: "grandma3-1",
    scenario: "CONNECTION_FAILURE",
  });
  assert.equal(result.state, "SIMULATED_CONNECTION_FAILED");
  assert.equal(result.simulatedConnectionSucceeded, false);
  assert.equal(result.networkTouched, false);
});

test("Titan test mode can simulate successful connection with no fixtures", async () => {
  const runner = new LightingConsoleTestModeRunner(planner("avolites.titan"));
  const result = await runner.run({
    workspaceId: "workspace-1",
    connectionId: "titan-1",
    scenario: "NO_FIXTURES",
  });
  assert.equal(result.state, "SIMULATED_NO_FIXTURES");
  assert.equal(result.simulatedConnectionSucceeded, true);
  assert.equal(result.simulatedFixtureDiscoveryCount, 0);
  assert.equal(result.writeCapabilitiesEnabled, false);
});

test("test mode validates explicit simulated fixture count", async () => {
  const runner = new LightingConsoleTestModeRunner(planner("avolites.titan"));
  await assert.rejects(
    () => runner.run({
      workspaceId: "workspace-1",
      connectionId: "titan-1",
      simulatedFixtureDiscoveryCount: -1,
    }),
    /non-negative integer/,
  );
});
