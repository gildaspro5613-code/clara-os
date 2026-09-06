import type { LightingConsoleOnboardingPlan } from "./lighting-console-onboarding";
import type { LightingConsoleOnboardingExecution } from "./lighting-console-onboarding-orchestrator";
import type { LightingConsoleTestModeExecution } from "./lighting-console-test-mode";

export type LightingConsoleSessionMode = "LIVE_READINESS" | "SIMULATION";

export type LightingConsoleSessionState =
  | "WAITING_FOR_CONFIGURATION"
  | "READY_FOR_CONNECTION_TEST"
  | "CONNECTION_FAILED"
  | "NO_FIXTURES_FOUND"
  | "READY_FOR_FIXTURE_MAPPING";

export type LightingConsoleOnboardingSession = {
  workspaceId: string;
  connectionId: string;
  provider: LightingConsoleOnboardingPlan["provider"];
  mode: LightingConsoleSessionMode;
  state: LightingConsoleSessionState;
  host: string;
  port: number;
  requirements: readonly string[];
  fixtureCount: number | null;
  networkTouched: boolean;
  physicalCertificationGranted: false;
  writeCapabilitiesEnabled: false;
};

export function sessionFromReadiness(
  execution: LightingConsoleOnboardingExecution,
): LightingConsoleOnboardingSession {
  const fixtureCount = "mappedFixtureCount" in execution.plan
    ? execution.plan.mappedFixtureCount
    : null;

  const state: LightingConsoleSessionState = execution.state === "READY_FOR_CONNECTION_TEST"
    ? "READY_FOR_CONNECTION_TEST"
    : execution.state === "READY_FOR_FIXTURE_MAPPING"
      ? "READY_FOR_FIXTURE_MAPPING"
      : "WAITING_FOR_CONFIGURATION";

  return {
    workspaceId: execution.plan.workspaceId,
    connectionId: execution.plan.connectionId,
    provider: execution.plan.provider,
    mode: "LIVE_READINESS",
    state,
    host: execution.plan.host,
    port: execution.plan.port,
    requirements: execution.plan.requirements,
    fixtureCount,
    networkTouched: execution.automaticStages.length > 0,
    physicalCertificationGranted: false,
    writeCapabilitiesEnabled: false,
  };
}

export function sessionFromSimulation(
  execution: LightingConsoleTestModeExecution,
): LightingConsoleOnboardingSession {
  const state: LightingConsoleSessionState = execution.state === "SIMULATED_CONNECTION_FAILED"
    ? "CONNECTION_FAILED"
    : execution.state === "SIMULATED_NO_FIXTURES"
      ? "NO_FIXTURES_FOUND"
      : "READY_FOR_FIXTURE_MAPPING";

  return {
    workspaceId: execution.plan.workspaceId,
    connectionId: execution.plan.connectionId,
    provider: execution.plan.provider,
    mode: "SIMULATION",
    state,
    host: execution.plan.host,
    port: execution.plan.port,
    requirements: execution.plan.requirements,
    fixtureCount: execution.simulatedFixtureDiscoveryCount,
    networkTouched: false,
    physicalCertificationGranted: false,
    writeCapabilitiesEnabled: false,
  };
}
