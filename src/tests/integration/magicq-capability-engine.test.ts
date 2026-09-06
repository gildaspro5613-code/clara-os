import assert from "node:assert/strict";
import test from "node:test";

import { getCapabilityPolicy } from "@/lib/capabilities/capability-policy";
import {
  DisabledMagicQLightingExecutor,
  executeMagicQFixtureIntensityCapability,
  type MagicQLightingExecutor,
} from "@/lib/capabilities/magicq-lighting/executor";
import type { MagicQFixtureIntensityRequest } from "@/lib/connectors/internal/chamsys/magicq";

class FakeMagicQLightingExecutor implements MagicQLightingExecutor {
  public requests: MagicQFixtureIntensityRequest[] = [];

  async setFixtureIntensity(request: MagicQFixtureIntensityRequest) {
    this.requests.push(request);
    return {
      provider: "chamsys" as const,
      connectorId: "chamsys.magicq" as const,
      capability: "lighting.fixture.intensity.set" as const,
      fixtureId: request.fixtureId,
      requestedIntensityPercent: request.intensityPercent,
      dispatched: true,
    };
  }
}

test("MagicQ Lighting remains Premium EXECUTE with explicit approval", () => {
  assert.deepEqual(getCapabilityPolicy("lighting.fixture.intensity.set"), {
    accessMode: "execute",
    requiredPlan: "premium",
    approvalPolicy: "required",
    sequential: true,
  });
});

test("isolated CapabilityEngine route dispatches a governed MagicQ-shaped request", async () => {
  const fake = new FakeMagicQLightingExecutor();
  const result = await executeMagicQFixtureIntensityCapability(
    fake,
    "workspace-1",
    {
      connectionId: "connection-1",
      fixtureId: "fixture-1",
      intensityPercent: 50,
    },
  );

  assert.equal(result.success, true);
  assert.deepEqual(fake.requests, [{
    workspaceId: "workspace-1",
    connectionId: "connection-1",
    fixtureId: "fixture-1",
    intensityPercent: 50,
  }]);
});

test("default MagicQ execution path fails closed while network is disabled", async () => {
  const result = await executeMagicQFixtureIntensityCapability(
    new DisabledMagicQLightingExecutor(),
    "workspace-1",
    {
      connectionId: "connection-1",
      fixtureId: "fixture-1",
      intensityPercent: 50,
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.message, "MAGICQ_NETWORK_DISABLED");
});

test("route rejects missing workspace and malformed context", async () => {
  const fake = new FakeMagicQLightingExecutor();
  const missingWorkspace = await executeMagicQFixtureIntensityCapability(
    fake,
    undefined,
    {},
  );
  const malformed = await executeMagicQFixtureIntensityCapability(
    fake,
    "workspace-1",
    { connectionId: "connection-1" },
  );
  assert.equal(missingWorkspace.success, false);
  assert.equal(malformed.success, false);
  assert.equal(fake.requests.length, 0);
});
