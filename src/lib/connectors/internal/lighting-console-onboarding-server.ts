import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { DatabaseMagicQConnectionConfigurationRepository } from "./chamsys/magicq/configuration-repository";
import { DatabaseGrandMA3ConnectionConfigurationRepository } from "./ma-lighting/grandma3/connection";
import { DatabaseTitanConnectionConfigurationRepository } from "./avolites/titan/connection";
import { LightingConsoleSelfServiceOnboardingPlanner } from "./lighting-console-onboarding";
import { LightingConsoleSelfServiceOnboardingOrchestrator } from "./lighting-console-onboarding-orchestrator";
import {
  sessionFromReadiness,
  sessionFromSimulation,
  type LightingConsoleOnboardingSession,
  type LightingConsoleSessionMode,
} from "./lighting-console-onboarding-session";
import {
  LightingConsoleTestModeRunner,
  type LightingConsoleTestModeScenario,
} from "./lighting-console-test-mode";

export type LightingConsoleOnboardingSessionRequest = {
  workspaceId: string;
  connectionId: string;
  mode: LightingConsoleSessionMode;
  scenario?: LightingConsoleTestModeScenario;
  simulatedFixtureDiscoveryCount?: number;
};

/**
 * Server composition root used by Clara Live's external onboarding bridge.
 *
 * LIVE_READINESS is deliberately readiness-only for now: the orchestrator is
 * created without a provider network runner, so this boundary never opens a
 * MagicQ/OSC/HTTP connection. SIMULATION uses the deterministic test runner.
 */
export class ServerLightingConsoleOnboardingSessionService {
  private readonly planner: LightingConsoleSelfServiceOnboardingPlanner;

  constructor() {
    this.planner = new LightingConsoleSelfServiceOnboardingPlanner(
      new DatabaseConnectionRepository(),
      new DatabaseMagicQConnectionConfigurationRepository(),
      new DatabaseGrandMA3ConnectionConfigurationRepository(),
      new DatabaseTitanConnectionConfigurationRepository(),
    );
  }

  async run(
    input: LightingConsoleOnboardingSessionRequest,
  ): Promise<LightingConsoleOnboardingSession> {
    if (input.mode === "SIMULATION") {
      const execution = await new LightingConsoleTestModeRunner(this.planner).run({
        workspaceId: input.workspaceId,
        connectionId: input.connectionId,
        scenario: input.scenario,
        simulatedFixtureDiscoveryCount: input.simulatedFixtureDiscoveryCount,
      });
      return sessionFromSimulation(execution);
    }

    const execution = await new LightingConsoleSelfServiceOnboardingOrchestrator(
      this.planner,
    ).run({
      workspaceId: input.workspaceId,
      connectionId: input.connectionId,
    });
    return sessionFromReadiness(execution);
  }
}
