import {
  ConnectionStatus,
  type Connection,
} from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import type {
  MagicQFixtureTargetResolver,
  ResolvedMagicQFixtureTarget,
} from "./types";

export const MAGICQ_CONNECTION_PROVIDER = "chamsys.magicq";

export interface MagicQConnectionConfiguration {
  readonly host: string;
  readonly port?: number;
  readonly fixtureChannels: Readonly<Record<string, number>>;
}

export interface MagicQConnectionConfigurationRepository {
  findByConnectionId(
    connectionId: string,
  ): Promise<MagicQConnectionConfiguration | null>;
}

export class MagicQConnectionResolutionError extends Error {
  constructor(
    public readonly code:
      | "CONNECTION_NOT_FOUND"
      | "CONNECTION_WORKSPACE_MISMATCH"
      | "CONNECTION_PROVIDER_MISMATCH"
      | "CONNECTION_INACTIVE"
      | "CONFIGURATION_NOT_FOUND"
      | "FIXTURE_MAPPING_NOT_FOUND",
  ) {
    super(code);
    this.name = "MagicQConnectionResolutionError";
  }
}

function assertConnection(
  connection: Connection | null,
  workspaceId: string,
): asserts connection is Connection {
  if (!connection) {
    throw new MagicQConnectionResolutionError("CONNECTION_NOT_FOUND");
  }
  if (connection.workspaceId !== workspaceId) {
    throw new MagicQConnectionResolutionError("CONNECTION_WORKSPACE_MISMATCH");
  }
  if (connection.provider !== MAGICQ_CONNECTION_PROVIDER) {
    throw new MagicQConnectionResolutionError("CONNECTION_PROVIDER_MISMATCH");
  }
  if (connection.status !== ConnectionStatus.ACTIVE) {
    throw new MagicQConnectionResolutionError("CONNECTION_INACTIVE");
  }
}

/**
 * Resolves one Clara fixture to the installation-specific MagicQ target.
 *
 * Universal Connections owns connection identity, workspace ownership,
 * provider identity and lifecycle status. Installation configuration remains
 * behind a separate repository boundary so no console address is stored in the
 * static connector definition.
 */
export class MagicQUniversalConnectionTargetResolver
implements MagicQFixtureTargetResolver {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly configurations: MagicQConnectionConfigurationRepository,
  ) {}

  async resolve(request: {
    readonly workspaceId: string;
    readonly connectionId: string;
    readonly fixtureId: string;
  }): Promise<ResolvedMagicQFixtureTarget> {
    const connection = await this.connections.findById(request.connectionId);
    assertConnection(connection, request.workspaceId);

    const configuration =
      await this.configurations.findByConnectionId(request.connectionId);
    if (!configuration) {
      throw new MagicQConnectionResolutionError("CONFIGURATION_NOT_FOUND");
    }

    const channelNumber = configuration.fixtureChannels[request.fixtureId];
    if (channelNumber === undefined) {
      throw new MagicQConnectionResolutionError("FIXTURE_MAPPING_NOT_FOUND");
    }

    return {
      host: configuration.host,
      port: configuration.port,
      channelNumber,
    };
  }
}
