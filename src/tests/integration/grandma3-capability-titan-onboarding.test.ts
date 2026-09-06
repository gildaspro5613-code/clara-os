import assert from "node:assert/strict";
import test from "node:test";

import { executeGrandMA3FixtureIntensityCapability } from "@/lib/capabilities/grandma3-lighting/executor";
import { TitanAutomaticOnboarding } from "@/lib/connectors/internal/avolites/titan/onboarding";

test("grandMA3 normalized capability delegates one fixture intensity request", async () => {
  const calls: unknown[] = [];
  const result = await executeGrandMA3FixtureIntensityCapability({
    async setFixtureIntensity(input) {
      calls.push(input);
      return { dispatched: true, fixtureId: input.fixtureId, requestedIntensityPercent: input.intensityPercent };
    },
  }, "workspace-1", {
    connectionId: "grandma3-1",
    fixtureId: "fixture-1",
    intensityPercent: 50,
  });

  assert.equal(result.success, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    workspaceId: "workspace-1",
    connectionId: "grandma3-1",
    fixtureId: "fixture-1",
    intensityPercent: 50,
  });
});

test("grandMA3 normalized capability fails closed on malformed context", async () => {
  let called = false;
  const result = await executeGrandMA3FixtureIntensityCapability({
    async setFixtureIntensity() {
      called = true;
      throw new Error("should not run");
    },
  }, "workspace-1", { fixtureId: "fixture-1", intensityPercent: 50 });
  assert.equal(result.success, false);
  assert.equal(called, false);
});

test("Titan automatic onboarding verifies API then discovers fixtures without writes", async () => {
  const requests: unknown[] = [];
  const onboarding = new TitanAutomaticOnboarding(() => ({
    async send(request) { requests.push(request); },
  }));

  const result = await onboarding.run({ host: "192.0.2.10", port: 4430 });
  assert.deepEqual(requests, [
    { method: "GET", path: "/titan/get/System/SoftwareVersion" },
    { method: "GET", path: "/titan/handles/Fixtures" },
  ]);
  assert.deepEqual(result, {
    ready: true,
    host: "192.0.2.10",
    port: 4430,
    completedStages: ["API_VERIFY", "FIXTURE_DISCOVERY"],
    writeCapabilitiesEnabled: false,
  });
});
