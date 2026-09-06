export interface MagicQFixtureIntensityRequest {
  readonly workspaceId: string;
  readonly connectionId: string;
  readonly fixtureId: string;
  readonly intensityPercent: number;
}

export interface ResolvedMagicQFixtureTarget {
  readonly host: string;
  readonly port?: number;
  /** MagicQ DMX channel number resolved from the Clara fixture identifier. */
  readonly channelNumber: number;
}

export interface MagicQFixtureTargetResolver {
  resolve(request: {
    readonly workspaceId: string;
    readonly connectionId: string;
    readonly fixtureId: string;
  }): Promise<ResolvedMagicQFixtureTarget>;
}

export interface MagicQFixtureIntensityResult {
  readonly provider: "chamsys";
  readonly connectorId: "chamsys.magicq";
  readonly capability: "lighting.fixture.intensity.set";
  readonly fixtureId: string;
  readonly requestedIntensityPercent: number;
  readonly dispatched: boolean;
}
