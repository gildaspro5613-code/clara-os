import { ConnectionStatus, type Connection } from "@/lib/connections/connection";
import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { DatabaseMagicQConnectionConfigurationRepository } from "./chamsys/magicq/configuration-repository";
import { MAGICQ_CONNECTION_PROVIDER } from "./chamsys/magicq";
import { DatabaseGrandMA3ConnectionConfigurationRepository } from "./ma-lighting/grandma3/connection";
import { GRANDMA3_CONNECTOR_ID } from "./ma-lighting/grandma3";
import { DatabaseTitanConnectionConfigurationRepository } from "./avolites/titan/connection";
import { AVOLITES_TITAN_CONNECTOR_ID, AVOLITES_TITAN_WEBAPI_DEFAULT_PORT } from "./avolites/titan";
import { MAGICQ_CREP_DEFAULT_PORT } from "./chamsys/magicq/crep";

export type SupportedLightingConsoleProvider =
  | typeof MAGICQ_CONNECTION_PROVIDER
  | typeof GRANDMA3_CONNECTOR_ID
  | typeof AVOLITES_TITAN_CONNECTOR_ID;

export type LightingConsoleConfigurationInput = {
  workspaceId: string;
  provider: SupportedLightingConsoleProvider;
  host: string;
  port?: number;
};

export type LightingConsoleConfigurationResult = {
  connectionId: string;
  provider: SupportedLightingConsoleProvider;
  host: string;
  port: number;
  status: typeof ConnectionStatus.ACTIVE;
  writeCapabilitiesEnabled: false;
  physicalCertificationGranted: false;
};

function normalizeHost(host: string): string {
  const value = host.trim();
  if (!value) throw new TypeError("Console host must be non-empty.");
  return value;
}

function normalizePort(provider: SupportedLightingConsoleProvider, port?: number): number {
  if (provider === MAGICQ_CONNECTION_PROVIDER) return port ?? MAGICQ_CREP_DEFAULT_PORT;
  if (provider === AVOLITES_TITAN_CONNECTOR_ID) return port ?? AVOLITES_TITAN_WEBAPI_DEFAULT_PORT;
  if (port === undefined) {
    throw new TypeError("grandMA3 OSC port must be explicitly configured.");
  }
  return port;
}

function assertPort(port: number): number {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("Console port must be an integer between 1 and 65535.");
  }
  return port;
}

export class ServerLightingConsoleConfigurationService {
  private readonly connections = new DatabaseConnectionRepository();
  private readonly magicQ = new DatabaseMagicQConnectionConfigurationRepository();
  private readonly grandMA3 = new DatabaseGrandMA3ConnectionConfigurationRepository();
  private readonly titan = new DatabaseTitanConnectionConfigurationRepository();

  async configure(input: LightingConsoleConfigurationInput): Promise<LightingConsoleConfigurationResult> {
    const host = normalizeHost(input.host);
    const port = assertPort(normalizePort(input.provider, input.port));

    const existing = await this.connections.findByWorkspaceAndProvider(
      input.workspaceId,
      input.provider,
    );
    const now = new Date();
    const connection: Connection = existing
      ? {
          ...existing,
          status: ConnectionStatus.ACTIVE,
          updatedAt: now,
        }
      : {
          id: crypto.randomUUID(),
          workspaceId: input.workspaceId,
          provider: input.provider,
          status: ConnectionStatus.ACTIVE,
          scopes: [],
          createdAt: now,
          updatedAt: now,
        };

    await this.connections.save(connection);

    switch (input.provider) {
      case MAGICQ_CONNECTION_PROVIDER:
        await this.magicQ.save(connection.id, { host, port, fixtureChannels: {} });
        break;
      case GRANDMA3_CONNECTOR_ID:
        await this.grandMA3.save(connection.id, { host, port, fixtureNumbers: {} });
        break;
      case AVOLITES_TITAN_CONNECTOR_ID:
        await this.titan.save(connection.id, { host, port });
        break;
    }

    return {
      connectionId: connection.id,
      provider: input.provider,
      host,
      port,
      status: ConnectionStatus.ACTIVE,
      writeCapabilitiesEnabled: false,
      physicalCertificationGranted: false,
    };
  }
}
