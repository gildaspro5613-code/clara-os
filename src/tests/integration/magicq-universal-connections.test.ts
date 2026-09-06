import assert from "node:assert/strict";
import test from "node:test";

import {
  ConnectionStatus,
  type Connection,
} from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import {
  authorizeCapability,
  getCapabilityPolicy,
} from "@/lib/capabilities/capability-policy";
import { CapabilityRegistry } from "@/lib/capabilities/capability-registry";
import {
  MAGICQ_CONNECTION_PROVIDER,
  MagicQConnectionResolutionError,
  MagicQUniversalConnectionTargetResolver,
  type MagicQConnectionConfiguration,
  type MagicQConnectionConfigurationRepository,
} from "@/lib/connectors/internal/chamsys/magicq";

class MemoryConnectionRepository implements ConnectionRepository {
  constructor(private readonly connection: Connection | null) {}

  async findById(connectionId: string): Promise<Connection | null> {
    return this.connection?.id === connectionId ? this.connection : null;
  }

  async findByWorkspaceAndProvider(
    workspaceId: string,
    provider: string,
  ): Promise<Connection | null> {
    if (
      this.connection?.workspaceId === workspaceId &&
      this.connection.provider === provider
    ) {
      return this.connection;
    }
    return null;
  }

  async save(): Promise<void> {}
  async updateStatus(): Promise<void> {}
}

class MemoryMagicQConfigurationRepository
implements MagicQConnectionConfigurationRepository {
  constructor(private readonly configuration: MagicQConnectionConfiguration | null) {}

  async findByConnectionId(): Promise<MagicQConnectionConfiguration | null> {
    return this.configuration;
  }
}

function connection(overrides: Partial<Connection> = {}): Connection {
  const now = new Date();
  return {
    id: "magicq-connection-1",
    workspaceId: "workspace-1",
    provider: MAGICQ_CONNECTION_PROVIDER,
    status: ConnectionStatus.ACTIVE,
    scopes: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const configuration: MagicQConnectionConfiguration = {
  host: "192.0.2.255",
  port: 6553,
  fixtureChannels: {
    "fixture-front-1": 42,
  },
};

test("MagicQ capability is visible in Clara registry", () => {
  const registry = new CapabilityRegistry();
  const capability = registry.findById("lighting.fixture.intensity.set");

  assert.ok(capability);
  assert.equal(capability?.name, "Set lighting fixture intensity");
});

test("MagicQ execution is Premium, sequential and approval-gated", () => {
  assert.deepEqual(getCapabilityPolicy("lighting.fixture.intensity.set"), {
    accessMode: "execute",
    requiredPlan: "premium",
    approvalPolicy: "required",
    sequential: true,
  });

  const denied = authorizeCapability("lighting.fixture.intensity.set", {
    actorId: "actor-1",
    workspaceId: "workspace-1",
    plan: "premium",
  });
  assert.equal(denied.allowed, false);
  if (!denied.allowed) assert.equal(denied.code, "APPROVAL_REQUIRED");

  const allowed = authorizeCapability("lighting.fixture.intensity.set", {
    actorId: "actor-1",
    workspaceId: "workspace-1",
    plan: "premium",
    approvedCapabilityIds: ["lighting.fixture.intensity.set"],
  });
  assert.equal(allowed.allowed, true);
});

test("resolves an active workspace-owned MagicQ connection and fixture mapping", async () => {
  const resolver = new MagicQUniversalConnectionTargetResolver(
    new MemoryConnectionRepository(connection()),
    new MemoryMagicQConfigurationRepository(configuration),
  );

  const target = await resolver.resolve({
    workspaceId: "workspace-1",
    connectionId: "magicq-connection-1",
    fixtureId: "fixture-front-1",
  });

  assert.deepEqual(target, {
    host: "192.0.2.255",
    port: 6553,
    channelNumber: 42,
  });
});

test("fails closed for wrong workspace, provider, inactive connection or missing fixture mapping", async () => {
  const cases: Array<{
    repository: MemoryConnectionRepository;
    configurations: MemoryMagicQConfigurationRepository;
    expected: MagicQConnectionResolutionError["code"];
  }> = [
    {
      repository: new MemoryConnectionRepository(connection()),
      configurations: new MemoryMagicQConfigurationRepository(configuration),
      expected: "CONNECTION_WORKSPACE_MISMATCH",
    },
    {
      repository: new MemoryConnectionRepository(connection({ provider: "google" })),
      configurations: new MemoryMagicQConfigurationRepository(configuration),
      expected: "CONNECTION_PROVIDER_MISMATCH",
    },
    {
      repository: new MemoryConnectionRepository(connection({ status: ConnectionStatus.DISABLED })),
      configurations: new MemoryMagicQConfigurationRepository(configuration),
      expected: "CONNECTION_INACTIVE",
    },
  ];

  await assert.rejects(
    new MagicQUniversalConnectionTargetResolver(
      cases[0]!.repository,
      cases[0]!.configurations,
    ).resolve({
      workspaceId: "workspace-other",
      connectionId: "magicq-connection-1",
      fixtureId: "fixture-front-1",
    }),
    (error: unknown) =>
      error instanceof MagicQConnectionResolutionError &&
      error.code === cases[0]!.expected,
  );

  for (const item of cases.slice(1)) {
    await assert.rejects(
      new MagicQUniversalConnectionTargetResolver(
        item.repository,
        item.configurations,
      ).resolve({
        workspaceId: "workspace-1",
        connectionId: "magicq-connection-1",
        fixtureId: "fixture-front-1",
      }),
      (error: unknown) =>
        error instanceof MagicQConnectionResolutionError &&
        error.code === item.expected,
    );
  }

  await assert.rejects(
    new MagicQUniversalConnectionTargetResolver(
      new MemoryConnectionRepository(connection()),
      new MemoryMagicQConfigurationRepository(configuration),
    ).resolve({
      workspaceId: "workspace-1",
      connectionId: "magicq-connection-1",
      fixtureId: "fixture-unknown",
    }),
    (error: unknown) =>
      error instanceof MagicQConnectionResolutionError &&
      error.code === "FIXTURE_MAPPING_NOT_FOUND",
  );
});
