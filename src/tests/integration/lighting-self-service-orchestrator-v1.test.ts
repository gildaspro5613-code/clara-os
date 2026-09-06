import assert from "node:assert/strict";
import test from "node:test";

import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  LightingConsoleSelfServiceOnboardingPlanner,
} from "@/lib/connectors/internal/lighting-console-onboarding";
import {
  LightingConsoleSelfServiceOnboardingOrchestrator,
} from "@/lib/connectors/internal/lighting-console-onboarding-orchestrator";

function connections(provider: string): ConnectionRepository {
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
    connections(provider),
    {
      async findByConnectionId() {
        return { host: "192.0.2.255", fixtureChannels: { wash: 17 } };
      },
    },
    {
      async findByConnectionId() {
        return { host: "192.0.2.30", port: 9000, fixtureNumbers: { wash: 42 } };
      },
    },
    {
      async findByConnectionId() {
        return { host: "192.0.2.50" };
      },
    },
  );
}

test("MagicQ onboarding stops at console configuration readiness without network", async () => {
  const orchestrator = new LightingConsoleSelfServiceOnboardingOrchestrator(
    planner("chamsys.magicq"),
  );

  const result = await orchestrator.run({ workspaceId: "workspace-1", connectionId: "magicq-1" });
  assert.equal(result.state, "WAITING_FOR_CONSOLE_CONFIGURATION");
  assert.deepEqual(result.automaticStages, []);
  assert.equal(result.humanInterventionRequired, false);
  assert.equal(result.writeCapabilitiesEnabled, false);
});

test("grandMA3 onboarding stops at console configuration readiness without network", async () => {
  const orchestrator = new LightingConsoleSelfServiceOnboardingOrchestrator(
    planner("ma-lighting.grandma3"),
  );

  const result = await orchestrator.run({ workspaceId: "workspace-1", connectionId: "grandma3-1" });
  assert.equal(result.state, "WAITING_FOR_CONSOLE_CONFIGURATION");
  assert.deepEqual(result.automaticStages, []);
  assert.equal(result.humanInterventionRequired, false);
  assert.equal(result.writeCapabilitiesEnabled, false);
});

test("Titan onboarding is ready for read-only connection test when no runner is injected", async () => {
  const orchestrator = new LightingConsoleSelfServiceOnboardingOrchestrator(
    planner("avolites.titan"),
  );

  const result = await orchestrator.run({ workspaceId: "workspace-1", connectionId: "titan-1" });
  assert.equal(result.state, "READY_FOR_CONNECTION_TEST");
  assert.deepEqual(result.automaticStages, []);
  assert.equal(result.writeCapabilitiesEnabled, false);
});

test("Titan onboarding advances to fixture mapping after certified read-only stages", async () => {
  const calls: unknown[] = [];
  const orchestrator = new LightingConsoleSelfServiceOnboardingOrchestrator(
    planner("avolites.titan"),
    {
      async run(target) {
        calls.push(target);
        return {
          ready: true,
          host: target.host,
          port: target.port,
          completedStages: ["API_VERIFY", "FIXTURE_DISCOVERY"],
          writeCapabilitiesEnabled: false,
        };
      },
    },
  );

  const result = await orchestrator.run({ workspaceId: "workspace-1", connectionId: "titan-1" });
  assert.deepEqual(calls, [{ host: "192.0.2.50", port: 4430 }]);
  assert.equal(result.state, "READY_FOR_FIXTURE_MAPPING");
  assert.deepEqual(result.automaticStages, ["API_VERIFY", "FIXTURE_DISCOVERY"]);
  assert.equal(result.humanInterventionRequired, false);
  assert.equal(result.writeCapabilitiesEnabled, false);
});
