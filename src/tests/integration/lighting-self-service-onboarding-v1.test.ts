import assert from "node:assert/strict";
import test from "node:test";

import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  LightingConsoleSelfServiceOnboardingPlanner,
} from "@/lib/connectors/internal/lighting-console-onboarding";

function repository(input: {
  provider: string;
  workspaceId?: string;
  status?: string;
}): ConnectionRepository {
  return {
    async findById(id) {
      return {
        id,
        workspaceId: input.workspaceId ?? "workspace-1",
        provider: input.provider,
        status: (input.status ?? ConnectionStatus.ACTIVE) as any,
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

const magicQConfigurations = {
  async findByConnectionId() {
    return {
      host: "192.0.2.255",
      fixtureChannels: { "front-wash": 17, "back-wash": 18 },
    };
  },
};

const grandMA3Configurations = {
  async findByConnectionId() {
    return {
      host: "192.0.2.30",
      port: 9000,
      fixtureNumbers: { "front-wash": 42, "back-wash": 43 },
    };
  },
};

const titanConfigurations = {
  async findByConnectionId() {
    return { host: "192.0.2.50" };
  },
};

test("MagicQ self-service plan requires CREP readiness and keeps network test disabled", async () => {
  const planner = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "chamsys.magicq" }),
    magicQConfigurations,
    grandMA3Configurations,
    titanConfigurations,
  );

  assert.deepEqual(await planner.plan({ workspaceId: "workspace-1", connectionId: "magicq-1" }), {
    provider: "chamsys.magicq",
    workspaceId: "workspace-1",
    connectionId: "magicq-1",
    host: "192.0.2.255",
    port: 6553,
    mappedFixtureCount: 2,
    connectionTestAvailable: false,
    writeCapabilitiesEnabled: false,
    requirements: [
      "MAGICQ_CREP_RX_ENABLED",
      "MAGICQ_DESTINATION_CONFIRMED",
    ],
  });
});

test("grandMA3 self-service plan requires customer OSC readiness and does not claim connectivity", async () => {
  const planner = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "ma-lighting.grandma3" }),
    magicQConfigurations,
    grandMA3Configurations,
    titanConfigurations,
  );

  assert.deepEqual(await planner.plan({ workspaceId: "workspace-1", connectionId: "grandma3-1" }), {
    provider: "ma-lighting.grandma3",
    workspaceId: "workspace-1",
    connectionId: "grandma3-1",
    host: "192.0.2.30",
    port: 9000,
    mappedFixtureCount: 2,
    connectionTestAvailable: false,
    writeCapabilitiesEnabled: false,
    requirements: [
      "OSC_INPUT_CONFIGURED",
      "OSC_RECEIVE_COMMAND_ENABLED",
      "OSC_TRANSPORT_AND_PORT_MATCH",
    ],
  });
});

test("Titan self-service plan exposes certified read-only connection test and keeps writes disabled", async () => {
  const planner = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "avolites.titan" }),
    magicQConfigurations,
    grandMA3Configurations,
    titanConfigurations,
  );

  assert.deepEqual(await planner.plan({ workspaceId: "workspace-1", connectionId: "titan-1" }), {
    provider: "avolites.titan",
    workspaceId: "workspace-1",
    connectionId: "titan-1",
    host: "192.0.2.50",
    port: 4430,
    connectionTestAvailable: true,
    writeCapabilitiesEnabled: false,
    requirements: ["TITAN_WEBAPI_REACHABLE"],
  });
});

test("self-service planning fails closed on workspace mismatch and inactive connections", async () => {
  const wrongWorkspace = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "avolites.titan", workspaceId: "workspace-other" }),
    magicQConfigurations,
    grandMA3Configurations,
    titanConfigurations,
  );
  await assert.rejects(
    () => wrongWorkspace.plan({ workspaceId: "workspace-1", connectionId: "titan-1" }),
    /CONNECTION_WORKSPACE_MISMATCH/,
  );

  const inactive = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "ma-lighting.grandma3", status: ConnectionStatus.DISABLED }),
    magicQConfigurations,
    grandMA3Configurations,
    titanConfigurations,
  );
  await assert.rejects(
    () => inactive.plan({ workspaceId: "workspace-1", connectionId: "grandma3-1" }),
    /CONNECTION_INACTIVE/,
  );
});

test("self-service planning rejects unsupported providers and missing configuration", async () => {
  const unsupported = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "unknown.console" }),
    magicQConfigurations,
    grandMA3Configurations,
    titanConfigurations,
  );
  await assert.rejects(
    () => unsupported.plan({ workspaceId: "workspace-1", connectionId: "unknown-1" }),
    /PROVIDER_NOT_SUPPORTED/,
  );

  const missingConfig = new LightingConsoleSelfServiceOnboardingPlanner(
    repository({ provider: "avolites.titan" }),
    magicQConfigurations,
    grandMA3Configurations,
    { async findByConnectionId() { return null; } },
  );
  await assert.rejects(
    () => missingConfig.plan({ workspaceId: "workspace-1", connectionId: "titan-1" }),
    /CONFIGURATION_NOT_FOUND/,
  );
});
