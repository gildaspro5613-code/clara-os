import {
  type MagicQFixtureIntensityRequest,
  type MagicQFixtureIntensityResult,
} from "@/lib/connectors/internal/chamsys/magicq";

export interface MagicQLightingExecutor {
  setFixtureIntensity(
    request: MagicQFixtureIntensityRequest,
  ): Promise<MagicQFixtureIntensityResult>;
}

export interface MagicQLightingCapabilityResult {
  readonly success: boolean;
  readonly message: string;
  readonly content?: string;
  readonly completedAt: Date;
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

/**
 * Provider-neutral routing for the single Lighting capability. Kept isolated
 * from CapabilityEngine so it can be tested without instantiating unrelated
 * database-backed workflows.
 */
export async function executeMagicQFixtureIntensityCapability(
  executor: MagicQLightingExecutor,
  workspaceId: string | undefined,
  context: unknown,
): Promise<MagicQLightingCapabilityResult> {
  if (!workspaceId) {
    return {
      success: false,
      message: "Workspace identity is required for MagicQ Lighting execution.",
      completedAt: new Date(),
    };
  }

  if (context === null || typeof context !== "object" || Array.isArray(context)) {
    return {
      success: false,
      message: "Invalid MagicQ Lighting execution context.",
      completedAt: new Date(),
    };
  }

  const input = context as {
    connectionId?: unknown;
    fixtureId?: unknown;
    intensityPercent?: unknown;
  };

  if (
    typeof input.connectionId !== "string" ||
    typeof input.fixtureId !== "string" ||
    typeof input.intensityPercent !== "number"
  ) {
    return {
      success: false,
      message: "Invalid MagicQ Lighting execution context.",
      completedAt: new Date(),
    };
  }

  try {
    const result = await executor.setFixtureIntensity({
      workspaceId,
      connectionId: input.connectionId,
      fixtureId: input.fixtureId,
      intensityPercent: input.intensityPercent,
    });
    return {
      success: true,
      message: "MagicQ Lighting intensity execution completed.",
      content: JSON.stringify(result),
      completedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error
        ? error.message
        : "MagicQ Lighting execution failed.",
      completedAt: new Date(),
    };
  }
}
