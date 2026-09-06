import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { sql } from "@/lib/core/store/database";
import {
  AVOLITES_TITAN_CONNECTOR_ID,
  AVOLITES_TITAN_WEBAPI_DEFAULT_PORT,
} from "./index";

export type TitanConnectionConfiguration = {
  host: string;
  port?: number;
};

export interface TitanConnectionConfigurationRepository {
  findByConnectionId(connectionId: string): Promise<TitanConnectionConfiguration | null>;
}

export type TitanResolvedConnectionTarget = {
  host: string;
  port: number;
};

export class TitanConnectionResolutionError extends Error {
  constructor(public readonly code:
    | "CONNECTION_NOT_FOUND"
    | "CONNECTION_WORKSPACE_MISMATCH"
    | "CONNECTION_PROVIDER_MISMATCH"
    | "CONNECTION_INACTIVE"
    | "CONFIGURATION_NOT_FOUND") {
    super(code);
    this.name = "TitanConnectionResolutionError";
  }
}

export function validateTitanConnectionConfiguration(
  configuration: TitanConnectionConfiguration,
): TitanConnectionConfiguration {
  const host = configuration.host.trim();
  if (!host) throw new TypeError("Titan configuration host must be non-empty.");
  const port = configuration.port ?? AVOLITES_TITAN_WEBAPI_DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("Titan WebAPI port must be between 1 and 65535.");
  }
  return { host, port };
}

export class TitanUniversalConnectionResolver {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly configurations: TitanConnectionConfigurationRepository,
  ) {}

  async resolve(input: {
    workspaceId: string;
    connectionId: string;
  }): Promise<TitanResolvedConnectionTarget> {
    const connection = await this.connections.findById(input.connectionId);
    if (!connection) throw new TitanConnectionResolutionError("CONNECTION_NOT_FOUND");
    if (connection.workspaceId !== input.workspaceId) {
      throw new TitanConnectionResolutionError("CONNECTION_WORKSPACE_MISMATCH");
    }
    if (connection.provider !== AVOLITES_TITAN_CONNECTOR_ID) {
      throw new TitanConnectionResolutionError("CONNECTION_PROVIDER_MISMATCH");
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new TitanConnectionResolutionError("CONNECTION_INACTIVE");
    }

    const configuration = await this.configurations.findByConnectionId(input.connectionId);
    if (!configuration) throw new TitanConnectionResolutionError("CONFIGURATION_NOT_FOUND");
    const normalized = validateTitanConnectionConfiguration(configuration);
    return {
      host: normalized.host,
      port: normalized.port ?? AVOLITES_TITAN_WEBAPI_DEFAULT_PORT,
    };
  }
}

type TitanConfigurationRow = { host: string; port: number };

export class DatabaseTitanConnectionConfigurationRepository
implements TitanConnectionConfigurationRepository {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_titan_connection_configuration (
        connection_id TEXT PRIMARY KEY REFERENCES clara_connections(id) ON DELETE CASCADE,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 4430,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    this.initialized = true;
  }

  async findByConnectionId(connectionId: string): Promise<TitanConnectionConfiguration | null> {
    await this.initialize();
    const rows = await sql`
      SELECT host, port
      FROM clara_titan_connection_configuration
      WHERE connection_id = ${connectionId}
      LIMIT 1
    ` as TitanConfigurationRow[];
    const row = rows[0];
    return row ? validateTitanConnectionConfiguration(row) : null;
  }

  async save(connectionId: string, configuration: TitanConnectionConfiguration): Promise<void> {
    const normalized = validateTitanConnectionConfiguration(configuration);
    await this.initialize();
    await sql`
      INSERT INTO clara_titan_connection_configuration
        (connection_id, host, port, updated_at)
      VALUES (${connectionId}, ${normalized.host}, ${normalized.port}, NOW())
      ON CONFLICT (connection_id) DO UPDATE SET
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        updated_at = NOW()
    `;
  }
}
