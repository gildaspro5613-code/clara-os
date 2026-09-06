import assert from "node:assert/strict";
import test from "node:test";

import {
  GrandMA3UniversalConnectionFixtureResolver,
  validateGrandMA3ConnectionConfiguration,
  type GrandMA3ConnectionConfiguration,
} from "@/lib/connectors/internal/ma-lighting/grandma3/connection";
import {
  TitanUniversalConnectionResolver,
  validateTitanConnectionConfiguration,
} from "@/lib/connectors/internal/avolites/titan/connection";

function connection(provider: string, overrides: Record<string, unknown> = {}) {
  return {
    id: "conn-1",
    workspaceId: "ws-1",
    provider,
    status: "ACTIVE" as const,
    scopes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function repository(value: ReturnType<typeof connection> | null) {
  return {
    async findById() { return value; },
    async findByWorkspaceAndProvider() { return value; },
    async save() {},
    async updateStatus() {},
  } as any;
}

test("grandMA3 configuration requires explicit OSC port and normalizes fixture mapping", () => {
  assert.deepEqual(validateGrandMA3ConnectionConfiguration({
    host: " 10.0.0.25 ",
    port: 9000,
    fixtureNumbers: { " front-wash ": 42 },
  }), {
    host: "10.0.0.25",
    port: 9000,
    fixtureNumbers: { "front-wash": 42 },
  });
});

test("grandMA3 configuration fails closed when OSC port is omitted", () => {
  const invalid = {
    host: "10.0.0.25",
    fixtureNumbers: {},
  } as unknown as GrandMA3ConnectionConfiguration;
  assert.throws(
    () => validateGrandMA3ConnectionConfiguration(invalid),
    /explicitly configured/,
  );
});

test("grandMA3 resolves fixture only through active workspace-owned Universal Connection", async () => {
  const resolver = new GrandMA3UniversalConnectionFixtureResolver(
    repository(connection("ma-lighting.grandma3")),
    { async findByConnectionId() {
      return { host: "10.0.0.25", port: 9000, fixtureNumbers: { "front-wash": 42 } };
    } },
  );

  assert.deepEqual(await resolver.resolveFixture({
    workspaceId: "ws-1",
    connectionId: "conn-1",
    fixtureId: "front-wash",
  }), { fixtureNumber: 42 });
});

test("grandMA3 fails closed for wrong provider and missing fixture mapping", async () => {
  const wrongProvider = new GrandMA3UniversalConnectionFixtureResolver(
    repository(connection("chamsys.magicq")),
    { async findByConnectionId() { return { host: "10.0.0.25", port: 9000, fixtureNumbers: {} }; } },
  );
  await assert.rejects(
    wrongProvider.resolveFixture({ workspaceId: "ws-1", connectionId: "conn-1", fixtureId: "x" }),
    /CONNECTION_PROVIDER_MISMATCH/,
  );

  const noMapping = new GrandMA3UniversalConnectionFixtureResolver(
    repository(connection("ma-lighting.grandma3")),
    { async findByConnectionId() { return { host: "10.0.0.25", port: 9000, fixtureNumbers: {} }; } },
  );
  await assert.rejects(
    noMapping.resolveFixture({ workspaceId: "ws-1", connectionId: "conn-1", fixtureId: "x" }),
    /FIXTURE_MAPPING_NOT_FOUND/,
  );
});

test("Titan configuration defaults to documented WebAPI port 4430", () => {
  assert.deepEqual(validateTitanConnectionConfiguration({ host: " 10.0.0.50 " }), {
    host: "10.0.0.50",
    port: 4430,
  });
});

test("Titan resolves API target only through active workspace-owned Universal Connection", async () => {
  const resolver = new TitanUniversalConnectionResolver(
    repository(connection("avolites.titan")),
    { async findByConnectionId() { return { host: "10.0.0.50" }; } },
  );
  assert.deepEqual(await resolver.resolve({ workspaceId: "ws-1", connectionId: "conn-1" }), {
    host: "10.0.0.50",
    port: 4430,
  });
});

test("Titan fails closed for inactive or cross-workspace connections", async () => {
  const inactive = new TitanUniversalConnectionResolver(
    repository(connection("avolites.titan", { status: "DISABLED" })),
    { async findByConnectionId() { return { host: "10.0.0.50" }; } },
  );
  await assert.rejects(
    inactive.resolve({ workspaceId: "ws-1", connectionId: "conn-1" }),
    /CONNECTION_INACTIVE/,
  );

  const wrongWorkspace = new TitanUniversalConnectionResolver(
    repository(connection("avolites.titan")),
    { async findByConnectionId() { return { host: "10.0.0.50" }; } },
  );
  await assert.rejects(
    wrongWorkspace.resolve({ workspaceId: "ws-2", connectionId: "conn-1" }),
    /CONNECTION_WORKSPACE_MISMATCH/,
  );
});
