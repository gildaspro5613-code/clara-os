import type { TitanResolvedConnectionTarget } from "./avolites/titan/connection";
import type { TitanOnboardingResult } from "./avolites/titan/onboarding";
import {
  type LightingConsoleOnboardingPlan,
  LightingConsoleSelfServiceOnboardingPlanner,
} from "./lighting-console-onboarding";

export type LightingConsoleOnboardingState =
  | "WAITING_FOR_CONSOLE_CONFIGURATION"
  | "READY_FOR_CONNECTION_TEST"
  | "READY_FOR_FIXTURE_MAPPING";

export type LightingConsoleOnboardingExecution = {
  plan: LightingConsoleOnboardingPlan;
  state: LightingConsoleOnboardingState;
  automaticStages: readonly string[];
  humanInterventionRequired: false;
  writeCapabilitiesEnabled: false;
};

export interface TitanAutomaticOnboardingRunner {
  run(target: TitanResolvedConnectionTarget): Promise<TitanOnboardingResult>;
}

/**
 * Clara Live self-service onboarding coordinator.
 *
 * It separates readiness planning from network execution:
 * - MagicQ and grandMA3 stop at console/network configuration readiness;
 * - Titan may run the already-certified read-only API verification + fixture discovery;
 * - no provider write capability is enabled here.
 */
export class LightingConsoleSelfServiceOnboardingOrchestrator {
  constructor(
    private readonly planner: LightingConsoleSelfServiceOnboardingPlanner,
    private readonly titanOnboarding?: TitanAutomaticOnboardingRunner,
  ) {}

  async run(input: {
    workspaceId: string;
    connectionId: string;
  }): Promise<LightingConsoleOnboardingExecution> {
    const plan = await this.planner.plan(input);

    if (plan.provider === "avolites.titan") {
      if (!this.titanOnboarding) {
        return {
          plan,
          state: "READY_FOR_CONNECTION_TEST",
          automaticStages: [],
          humanInterventionRequired: false,
          writeCapabilitiesEnabled: false,
        };
      }

      const result = await this.titanOnboarding.run({ host: plan.host, port: plan.port });
      return {
        plan,
        state: "READY_FOR_FIXTURE_MAPPING",
        automaticStages: result.completedStages,
        humanInterventionRequired: false,
        writeCapabilitiesEnabled: false,
      };
    }

    return {
      plan,
      state: "WAITING_FOR_CONSOLE_CONFIGURATION",
      automaticStages: [],
      humanInterventionRequired: false,
      writeCapabilitiesEnabled: false,
    };
  }
}
