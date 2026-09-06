import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { ProviderAwareLightingFixtureIntensityExecutor } from "@/lib/capabilities/lighting/provider-router";

function repository(provider: string, workspaceId = "workspace-1"): ConnectionRepository {
  return {
    async findById(id) {
      return { id, workspaceId, provider, status: ConnectionStatus.ACTIVE, scopes: [], createdAt: new Date(0), updatedAt: new Date(0) };
    },
    async findByWorkspaceAndProvider() { return null; },
    async save() {},
    async updateStatus() {},
  };
}

function executor(label: string, calls: string[]) {
  return {
    async setFixtureIntensity() {
      calls.push(label);
      return { dispatched: true as const, fixtureId: "fixture-1", requestedIntensityPercent: 50 };
    },
  };
}

const input = { workspaceId: "workspace-1", connectionId: "connection-1", fixtureId: "fixture-1", intensityPercent: 50 };

test("routes MagicQ by Universal Connection provider", async () => {
  const calls: string[] = [];
  const router = new ProviderAwareLightingFixtureIntensityExecutor(repository("chamsys.magicq"), executor("magicq", calls), executor("grandma3", calls));
  await router.setFixtureIntensity(input);
  assert.deepEqual(calls, ["magicq"]);
});

test("routes grandMA3 by Universal Connection provider", async () => {
  const calls: string[] = [];
  const router = new ProviderAwareLightingFixtureIntensityExecutor(repository("ma-lighting.grandma3"), executor("magicq", calls), executor("grandma3", calls));
  await router.setFixtureIntensity(input);
  assert.deepEqual(calls, ["grandma3"]);
});

test("rejects workspace mismatch before provider execution", async () => {
  const calls: string[] = [];
  const router = new ProviderAwareLightingFixtureIntensityExecutor(repository("chamsys.magicq", "workspace-other"), executor("magicq", calls), executor("grandma3", calls));
  await assert.rejects(() => router.setFixtureIntensity(input), /LIGHTING_CONNECTION_WORKSPACE_MISMATCH/);
  assert.deepEqual(calls, []);
});

test("fails closed for Titan until write execution is certified", async () => {
  const calls: string[] = [];
  const router = new ProviderAwareLightingFixtureIntensityExecutor(repository("avolites.titan"), executor("magicq", calls), executor("grandma3", calls));
  await assert.rejects(() => router.setFixtureIntensity(input), /LIGHTING_PROVIDER_NOT_EXECUTABLE:avolites.titan/);
  assert.deepEqual(calls, []);
});
