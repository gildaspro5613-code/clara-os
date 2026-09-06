import assert from "node:assert/strict";
import test from "node:test";

import {
  sessionFromReadiness,
  sessionFromSimulation,
} from "@/lib/connectors/internal/lighting-console-onboarding-session";

const grandMA3Plan = {
  provider: "ma-lighting.grandma3" as const,
  workspaceId: "workspace-1",
  connectionId: "grandma3-1",
  host: "192.0.2.30",
  port: 9000,
  mappedFixtureCount: 2,
  connectionTestAvailable: false as const,
  writeCapabilitiesEnabled: false as const,
  requirements: [
    "OSC_INPUT_CONFIGURED",
    "OSC_RECEIVE_COMMAND_ENABLED",
    "OSC_TRANSPORT_AND_PORT_MATCH",
  ] as const,
};

const titanPlan = {
  provider: "avolites.titan" as const,
  workspaceId: "workspace-1",
  connectionId: "titan-1",
  host: "192.0.2.50",
  port: 4430,
  connectionTestAvailable: true as const,
  writeCapabilitiesEnabled: false as const,
  requirements: ["TITAN_WEBAPI_REACHABLE"] as const,
};

test("readiness session preserves configuration state without claiming certification", () => {
  const session = sessionFromReadiness({
    plan: grandMA3Plan,
    state: "WAITING_FOR_CONSOLE_CONFIGURATION",
    automaticStages: [],
    humanInterventionRequired: false,
    writeCapabilitiesEnabled: false,
  });

  assert.deepEqual(session, {
    workspaceId: "workspace-1",
    connectionId: "grandma3-1",
    provider: "ma-lighting.grandma3",
    mode: "LIVE_READINESS",
    state: "WAITING_FOR_CONFIGURATION",
    host: "192.0.2.30",
    port: 9000,
    requirements: grandMA3Plan.requirements,
    fixtureCount: 2,
    networkTouched: false,
    physicalCertificationGranted: false,
    writeCapabilitiesEnabled: false,
  });
});

test("Titan readiness with automatic read-only stages becomes mapping-ready", () => {
  const session = sessionFromReadiness({
    plan: titanPlan,
    state: "READY_FOR_FIXTURE_MAPPING",
    automaticStages: ["API_VERIFY", "FIXTURE_DISCOVERY"],
    humanInterventionRequired: false,
    writeCapabilitiesEnabled: false,
  });

  assert.equal(session.state, "READY_FOR_FIXTURE_MAPPING");
  assert.equal(session.networkTouched, true);
  assert.equal(session.fixtureCount, null);
  assert.equal(session.physicalCertificationGranted, false);
  assert.equal(session.writeCapabilitiesEnabled, false);
});

test("simulation normalizes connection failure for Clara Live QA", () => {
  const session = sessionFromSimulation({
    mode: "SIMULATION",
    plan: titanPlan,
    scenario: "CONNECTION_FAILURE",
    state: "SIMULATED_CONNECTION_FAILED",
    simulatedConnectionSucceeded: false,
    simulatedFixtureDiscoveryCount: 0,
    networkTouched: false,
    physicalCertificationGranted: false,
    writeCapabilitiesEnabled: false,
  });

  assert.equal(session.mode, "SIMULATION");
  assert.equal(session.state, "CONNECTION_FAILED");
  assert.equal(session.fixtureCount, 0);
  assert.equal(session.networkTouched, false);
  assert.equal(session.physicalCertificationGranted, false);
});

test("simulation normalizes no-fixture and success states", () => {
  const noFixtures = sessionFromSimulation({
    mode: "SIMULATION",
    plan: titanPlan,
    scenario: "NO_FIXTURES",
    state: "SIMULATED_NO_FIXTURES",
    simulatedConnectionSucceeded: true,
    simulatedFixtureDiscoveryCount: 0,
    networkTouched: false,
    physicalCertificationGranted: false,
    writeCapabilitiesEnabled: false,
  });
  assert.equal(noFixtures.state, "NO_FIXTURES_FOUND");

  const success = sessionFromSimulation({
    mode: "SIMULATION",
    plan: titanPlan,
    scenario: "SUCCESS",
    state: "SIMULATED_READY_FOR_FIXTURE_MAPPING",
    simulatedConnectionSucceeded: true,
    simulatedFixtureDiscoveryCount: 12,
    networkTouched: false,
    physicalCertificationGranted: false,
    writeCapabilitiesEnabled: false,
  });
  assert.equal(success.state, "READY_FOR_FIXTURE_MAPPING");
  assert.equal(success.fixtureCount, 12);
});
