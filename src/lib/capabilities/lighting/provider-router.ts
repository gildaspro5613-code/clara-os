import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { GRANDMA3_CONNECTOR_ID } from "@/lib/connectors/internal/ma-lighting/grandma3";

const MAGICQ_CONNECTOR_ID = "chamsys.magicq";

export type LightingFixtureIntensityInput = {
  workspaceId: string;
  connectionId: string;
  fixtureId: string;
  intensityPercent: number;
};

export interface LightingFixtureIntensityExecutor {
  setFixtureIntensity(input: LightingFixtureIntensityInput): Promise<unknown>;
}

/** Routes the provider-neutral Lighting capability by Universal Connection. */
export class ProviderAwareLightingFixtureIntensityExecutor
implements LightingFixtureIntensityExecutor {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly magicq: LightingFixtureIntensityExecutor,
    private readonly grandMA3: LightingFixtureIntensityExecutor,
  ) {}

  async setFixtureIntensity(input: LightingFixtureIntensityInput): Promise<unknown> {
    const connection = await this.connections.findById(input.connectionId);
    if (!connection) throw new Error("LIGHTING_CONNECTION_NOT_FOUND");
    if (connection.workspaceId !== input.workspaceId) {
      throw new Error("LIGHTING_CONNECTION_WORKSPACE_MISMATCH");
    }

    switch (connection.provider) {
      case MAGICQ_CONNECTOR_ID:
        return this.magicq.setFixtureIntensity(input);
      case GRANDMA3_CONNECTOR_ID:
        return this.grandMA3.setFixtureIntensity(input);
      default:
        throw new Error(`LIGHTING_PROVIDER_NOT_EXECUTABLE:${connection.provider}`);
    }
  }
}
