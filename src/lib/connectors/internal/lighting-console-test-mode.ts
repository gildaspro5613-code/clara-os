import {
  type LightingConsoleOnboardingPlan,
  LightingConsoleSelfServiceOnboardingPlanner,
} from "./lighting-console-onboarding";

export type LightingConsoleTestModeScenario =
  | "SUCCESS"
  | "CONNECTION_FAILURE"
  | "NO_FIXTURES";

export type LightingConsoleTestModeState =
  | "SIMULATED_CONNECTION_FAILED"
  | "SIMULATED_READY_FOR_FIXTURE_MAPPING"
  | "SIMULATED_NO_FIXTURES";

export type LightingConsoleTestModeExecution = {
  mode: "SIMULATION";
  plan: LightingConsoleOnboardingPlan;
  scenario: LightingConsoleTestModeScenario;
  state: LightingConsoleTestModeState;
  simulatedConnectionSucceeded: boolean;
  simulatedFixtureDiscoveryCount: number;
  networkTouched: false;
  physicalCertificationGranted: false;
  writeCapabilitiesEnabled: false;
};

/**
 * Deterministic Clara Live test-mode runner.
 *
 * It exercises the complete UX/state path for known lighting consoles without
 * opening sockets, issuing HTTP requests, sending OSC/CREP packets, or claiming
 * physical certification. It is intended for product/QA testing before real
 * hardware is available.
 */
export class LightingConsoleTestModeRunner {
  constructor(
    private readonly planner: LightingConsoleSelfServiceOnboardingPlanner,
  ) {}

  async run(input: {
    workspaceId: string;
    connectionId: string;
    scenario?: LightingConsoleTestModeScenario;
    simulatedFixtureDiscoveryCount?: number;
  }): Promise<LightingConsoleTestModeExecution> {
    const plan = await this.planner.plan({
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
    });
    const scenario = input.scenario ?? "SUCCESS";

    if (scenario === "CONNECTION_FAILURE") {
      return {
        mode: "SIMULATION",
        plan,
        scenario,
        state: "SIMULATED_CONNECTION_FAILED",
        simulatedConnectionSucceeded: false,
        simulatedFixtureDiscoveryCount: 0,
        networkTouched: false,
        physicalCertificationGranted: false,
        writeCapabilitiesEnabled: false,
      };
    }

    if (scenario === "NO_FIXTURES") {
      return {
        mode: "SIMULATION",
        plan,
        scenario,
        state: "SIMULATED_NO_FIXTURES",
        simulatedConnectionSucceeded: true,
        simulatedFixtureDiscoveryCount: 0,
        networkTouched: false,
        physicalCertificationGranted: false,
        writeCapabilitiesEnabled: false,
      };
    }

    const discovered = input.simulatedFixtureDiscoveryCount ?? defaultFixtureCount(plan);
    if (!Number.isInteger(discovered) || discovered < 0) {
      throw new RangeError("Simulated fixture discovery count must be a non-negative integer.");
    }

    return {
      mode: "SIMULATION",
      plan,
      scenario,
      state: discovered > 0
        ? "SIMULATED_READY_FOR_FIXTURE_MAPPING"
        : "SIMULATED_NO_FIXTURES",
      simulatedConnectionSucceeded: true,
      simulatedFixtureDiscoveryCount: discovered,
      networkTouched: false,
      physicalCertificationGranted: false,
      writeCapabilitiesEnabled: false,
    };
  }
}

function defaultFixtureCount(plan: LightingConsoleOnboardingPlan): number {
  if ("mappedFixtureCount" in plan) return Math.max(plan.mappedFixtureCount, 1);
  return 1;
}
