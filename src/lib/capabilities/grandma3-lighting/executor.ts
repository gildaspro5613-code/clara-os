import { GrandMA3LightingAdapter } from "@/lib/connectors/internal/ma-lighting/grandma3";

export interface GrandMA3LightingExecutor {
  setFixtureIntensity(input: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
    intensityPercent: number;
  }): Promise<{ dispatched: true; fixtureId: string; requestedIntensityPercent: number }>;
}

export class AdapterGrandMA3LightingExecutor implements GrandMA3LightingExecutor {
  constructor(private readonly adapter: GrandMA3LightingAdapter) {}

  setFixtureIntensity(input: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
    intensityPercent: number;
  }) {
    return this.adapter.setFixtureIntensity(input);
  }
}

export type GrandMA3LightingCapabilityResult = {
  success: boolean;
  message: string;
  content?: string;
  completedAt: Date;
};

/** Provider-neutral capability boundary; transport remains injected/offline. */
export async function executeGrandMA3FixtureIntensityCapability(
  executor: GrandMA3LightingExecutor,
  workspaceId: string | undefined,
  context: unknown,
): Promise<GrandMA3LightingCapabilityResult> {
  if (!workspaceId || context === null || typeof context !== "object" || Array.isArray(context)) {
    return { success: false, message: "Invalid grandMA3 Lighting execution context.", completedAt: new Date() };
  }
  const input = context as Record<string, unknown>;
  if (typeof input.connectionId !== "string" || typeof input.fixtureId !== "string" || typeof input.intensityPercent !== "number") {
    return { success: false, message: "Invalid grandMA3 Lighting execution context.", completedAt: new Date() };
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
      message: "grandMA3 Lighting intensity execution completed.",
      content: JSON.stringify(result),
      completedAt: new Date(),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "grandMA3 Lighting execution failed.",
      completedAt: new Date(),
    };
  }
}
