import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { CHAMSYS_MAGICQ_CONNECTOR_ID } from "@/lib/connectors/internal/chamsys/magicq";
import { MA_LIGHTING_GRANDMA3_CONNECTOR_ID } from "@/lib/connectors/internal/ma-lighting/grandma3";
import type { MagicQLightingExecutor } from "../magicq-lighting/executor";
import type { GrandMA3LightingExecutor } from "../grandma3-lighting/executor";

export type LightingFixtureIntensityInput = {
  workspaceId: string;
  connectionId: string;
  fixtureId: string;
  intensityPercent: number;
};

export interface LightingFixtureIntensityExecutor {
  setFixtureIntensity(input: LightingFixtureIntensityInput): Promise<unknown>;
}

/**
 * Routes one provider-neutral Lighting capability by the Universal Connection.
 * The Clara capability never needs a provider-specific capability id.
 */
export class ProviderAwareLightingFixtureIntensityExecutor
implements LightingFixtureIntensityExecutor {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly magicq: MagicQLightingExecutor,
    private readonly grandMA3: GrandMA3LightingExecutor,
  ) {}

  async setFixtureIntensity(input: LightingFixtureIntensityInput): Promise<unknown> {
    const connection = await this.connections.findById(input.connectionId);
    if (!connection) throw new Error("LIGHTING_CONNECTION_NOT_FOUND");
    if (connection.workspaceId !== input.workspaceId) {
      throw new Error("LIGHTING_CONNECTION_WORKSPACE_MISMATCH");
    }

    switch (connection.provider) {
      case CHAMSYS_MAGICQ_CONNECTOR_ID:
        return this.magicq.setFixtureIntensity(input);
      case MA_LIGHTING_GRANDMA3_CONNECTOR_ID:
        return this.grandMA3.setFixtureIntensity(input);
      default:
        throw new Error(`LIGHTING_PROVIDER_NOT_EXECUTABLE:${connection.provider}`);
    }
  }
}
