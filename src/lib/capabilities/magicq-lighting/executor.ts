import {
  type MagicQFixtureIntensityRequest,
  type MagicQFixtureIntensityResult,
} from "@/lib/connectors/internal/chamsys/magicq";

export interface MagicQLightingExecutor {
  setFixtureIntensity(
    request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult>;
}

/**
 * Safe default until the explicit hardware-test step installs a real MagicQ
 * executor. CapabilityEngine may route an approved request here, but no network
 * path exists through this implementation.
 */
export class DisabledMagicQLightingExecutor implements MagicQLightingExecutor {
  async setFixtureIntensity(
    _request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult> {
    throw new Error("MAGICQ_NETWORK_DISABLED");
  }
}
