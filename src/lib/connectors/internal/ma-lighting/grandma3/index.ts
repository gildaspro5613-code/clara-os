export const GRANDMA3_CONNECTOR_ID = "ma-lighting.grandma3";
export const GRANDMA3_OSC_COMMAND_ADDRESS = "/cmd";

export type GrandMA3OscMessage = {
  address: "/cmd";
  type: "s";
  value: string;
};

export type GrandMA3FixtureTarget = {
  fixtureNumber: number;
};

export interface GrandMA3FixtureResolver {
  resolveFixture(input: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
  }): Promise<GrandMA3FixtureTarget>;
}

export interface GrandMA3OscTransport {
  send(message: GrandMA3OscMessage): Promise<void>;
}

export function buildGrandMA3IntensityMessage(
  fixtureNumber: number,
  intensityPercent: number,
): GrandMA3OscMessage {
  if (!Number.isInteger(fixtureNumber) || fixtureNumber < 1) {
    throw new RangeError("grandMA3 fixture number must be a positive integer.");
  }
  if (!Number.isFinite(intensityPercent) || intensityPercent < 0 || intensityPercent > 100) {
    throw new RangeError("grandMA3 intensity must be between 0 and 100.");
  }

  return {
    address: GRANDMA3_OSC_COMMAND_ADDRESS,
    type: "s",
    value: `Fixture ${fixtureNumber} At ${intensityPercent}`,
  };
}

/** Offline adapter boundary. OSC packet/network implementation is intentionally injected. */
export class GrandMA3LightingAdapter {
  constructor(
    private readonly fixtures: GrandMA3FixtureResolver,
    private readonly transport: GrandMA3OscTransport,
  ) {}

  async setFixtureIntensity(input: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
    intensityPercent: number;
  }): Promise<{ dispatched: true; fixtureId: string; requestedIntensityPercent: number }> {
    if (!input.workspaceId.trim() || !input.connectionId.trim() || !input.fixtureId.trim()) {
      throw new TypeError("grandMA3 Lighting identifiers must be non-empty.");
    }
    const target = await this.fixtures.resolveFixture(input);
    const message = buildGrandMA3IntensityMessage(target.fixtureNumber, input.intensityPercent);
    await this.transport.send(message);
    return {
      dispatched: true,
      fixtureId: input.fixtureId,
      requestedIntensityPercent: input.intensityPercent,
    };
  }
}
