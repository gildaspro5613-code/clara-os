export const AVOLITES_TITAN_CONNECTOR_ID = "avolites.titan";
export const AVOLITES_TITAN_WEBAPI_DEFAULT_PORT = 4430;

export type TitanFixtureTarget = {
  userNumber: number;
};

export interface TitanFixtureResolver {
  resolveFixture(input: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
  }): Promise<TitanFixtureTarget>;
}

export type TitanHttpRequest = {
  method: "GET";
  path: string;
};

export interface TitanHttpTransport {
  send(request: TitanHttpRequest): Promise<void>;
}

/**
 * Builds a Titan WebAPI script request without a host. The installation host and
 * port belong to Universal Connections/configuration, never the connector definition.
 *
 * Titan exposes console scripting through /titan/script/... and supports typed
 * query parameters. Fixture selection + intensity is kept behind this adapter
 * boundary until its exact provider method is certified against a real Titan desk.
 */
export function buildTitanFixtureHandleLookupPath(): string {
  return "/titan/handles/Fixtures";
}

export function buildTitanSoftwareVersionPath(): string {
  return "/titan/get/System/SoftwareVersion";
}

/**
 * V1 is deliberately discovery/readiness-only: the official API documents fixture
 * handles and typed scripts, but we do not invent an intensity mutation endpoint.
 */
export class TitanLightingFoundation {
  constructor(private readonly transport: TitanHttpTransport) {}

  async verifyApi(): Promise<void> {
    await this.transport.send({ method: "GET", path: buildTitanSoftwareVersionPath() });
  }

  async discoverFixtureHandles(): Promise<void> {
    await this.transport.send({ method: "GET", path: buildTitanFixtureHandleLookupPath() });
  }
}
