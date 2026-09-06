import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { sql } from "@/lib/core/store/database";
import {
  GRANDMA3_CONNECTOR_ID,
  type GrandMA3FixtureResolver,
  type GrandMA3FixtureTarget,
} from "./index";

export type GrandMA3ConnectionConfiguration = {
  host: string;
  port: number;
  fixtureNumbers: Readonly<Record<string, number>>;
};

export interface GrandMA3ConnectionConfigurationRepository {
  findByConnectionId(connectionId: string): Promise<GrandMA3ConnectionConfiguration | null>;
}

export class GrandMA3ConnectionResolutionError extends Error {
  constructor(public readonly code:
    | "CONNECTION_NOT_FOUND"
    | "CONNECTION_WORKSPACE_MISMATCH"
    | "CONNECTION_PROVIDER_MISMATCH"
    | "CONNECTION_INACTIVE"
    | "CONFIGURATION_NOT_FOUND"
    | "FIXTURE_MAPPING_NOT_FOUND") {
    super(code);
    this.name = "GrandMA3ConnectionResolutionError";
  }
}

export function validateGrandMA3ConnectionConfiguration(
  configuration: GrandMA3ConnectionConfiguration,
): GrandMA3ConnectionConfiguration {
  const host = configuration.host.trim();
  if (!host) throw new TypeError("grandMA3 configuration host must be non-empty.");

  const port = configuration.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("grandMA3 OSC port must be explicitly configured between 1 and 65535.");
  }

  const fixtureNumbers: Record<string, number> = {};
  for (const [fixtureId, fixtureNumber] of Object.entries(configuration.fixtureNumbers)) {
    const normalizedFixtureId = fixtureId.trim();
    if (!normalizedFixtureId) throw new TypeError("grandMA3 fixture ids must be non-empty.");
    if (!Number.isInteger(fixtureNumber) || fixtureNumber < 1) {
      throw new RangeError(`grandMA3 fixture number for ${normalizedFixtureId} must be a positive integer.`);
    }
    fixtureNumbers[normalizedFixtureId] = fixtureNumber;
  }

  return { host, port, fixtureNumbers };
}

export class GrandMA3UniversalConnectionFixtureResolver implements GrandMA3FixtureResolver {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly configurations: GrandMA3ConnectionConfigurationRepository,
  ) {}

  async resolveFixture(input: {
    workspaceId: string;
    connectionId: string;
    fixtureId: string;
  }): Promise<GrandMA3FixtureTarget> {
    const connection = await this.connections.findById(input.connectionId);
    if (!connection) throw new GrandMA3ConnectionResolutionError("CONNECTION_NOT_FOUND");
    if (connection.workspaceId !== input.workspaceId) {
      throw new GrandMA3ConnectionResolutionError("CONNECTION_WORKSPACE_MISMATCH");
    }
    if (connection.provider !== GRANDMA3_CONNECTOR_ID) {
      throw new GrandMA3ConnectionResolutionError("CONNECTION_PROVIDER_MISMATCH");
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new GrandMA3ConnectionResolutionError("CONNECTION_INACTIVE");
    }

    const configuration = await this.configurations.findByConnectionId(input.connectionId);
    if (!configuration) throw new GrandMA3ConnectionResolutionError("CONFIGURATION_NOT_FOUND");
    const normalized = validateGrandMA3ConnectionConfiguration(configuration);
    const fixtureNumber = normalized.fixtureNumbers[input.fixtureId];
    if (fixtureNumber === undefined) {
      throw new GrandMA3ConnectionResolutionError("FIXTURE_MAPPING_NOT_FOUND");
    }
    return { fixtureNumber };
  }
}

type GrandMA3Row = {
  host: string;
  port: number;
  fixture_numbers: Record<string, number> | string;
};

function parseFixtureNumbers(value: GrandMA3Row["fixture_numbers"]): Record<string, number> {
  return typeof value === "string" ? JSON.parse(value) as Record<string, number> : value;
}

export class DatabaseGrandMA3ConnectionConfigurationRepository
implements GrandMA3ConnectionConfigurationRepository {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_grandma3_connection_configuration (
        connection_id TEXT PRIMARY KEY REFERENCES clara_connections(id) ON DELETE CASCADE,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        fixture_numbers JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      ALTER TABLE clara_grandma3_connection_configuration
      ALTER COLUMN port DROP DEFAULT
    `;
    this.initialized = true;
  }

  async findByConnectionId(connectionId: string): Promise<GrandMA3ConnectionConfiguration | null> {
    await this.initialize();
    const rows = await sql`
      SELECT host, port, fixture_numbers
      FROM clara_grandma3_connection_configuration
      WHERE connection_id = ${connectionId}
      LIMIT 1
    ` as GrandMA3Row[];
    const row = rows[0];
    if (!row) return null;
    return validateGrandMA3ConnectionConfiguration({
      host: row.host,
      port: row.port,
      fixtureNumbers: parseFixtureNumbers(row.fixture_numbers),
    });
  }

  async save(connectionId: string, configuration: GrandMA3ConnectionConfiguration): Promise<void> {
    const normalized = validateGrandMA3ConnectionConfiguration(configuration);
    await this.initialize();
    await sql`
      INSERT INTO clara_grandma3_connection_configuration
        (connection_id, host, port, fixture_numbers, updated_at)
      VALUES (${connectionId}, ${normalized.host}, ${normalized.port}, ${JSON.stringify(normalized.fixtureNumbers)}, NOW())
      ON CONFLICT (connection_id) DO UPDATE SET
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        fixture_numbers = EXCLUDED.fixture_numbers,
        updated_at = NOW()
    `;
  }
}
