import type { TitanHttpTransport } from "./index";
import { TitanLightingFoundation } from "./index";
import type { TitanConnectionTarget } from "./connection";

export type TitanOnboardingStage = "API_VERIFY" | "FIXTURE_DISCOVERY";

export type TitanOnboardingResult = {
  ready: true;
  host: string;
  port: number;
  completedStages: readonly TitanOnboardingStage[];
  writeCapabilitiesEnabled: false;
};

/**
 * Clara Live onboarding orchestration for Titan V1.
 * It only performs the already-certified read/readiness operations. No write
 * capability is enabled until an official mutation is separately certified.
 */
export class TitanAutomaticOnboarding {
  constructor(private readonly transportFactory: (target: TitanConnectionTarget) => TitanHttpTransport) {}

  async run(target: TitanConnectionTarget): Promise<TitanOnboardingResult> {
    const foundation = new TitanLightingFoundation(this.transportFactory(target));
    const completedStages: TitanOnboardingStage[] = [];

    await foundation.verifyApi();
    completedStages.push("API_VERIFY");

    await foundation.discoverFixtureHandles();
    completedStages.push("FIXTURE_DISCOVERY");

    return {
      ready: true,
      host: target.host,
      port: target.port,
      completedStages,
      writeCapabilitiesEnabled: false,
    };
  }
}
