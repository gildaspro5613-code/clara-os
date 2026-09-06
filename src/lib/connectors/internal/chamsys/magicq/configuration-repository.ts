import { sql } from "@/lib/core/store/database";
import type {
  MagicQConnectionConfiguration,
  MagicQConnectionConfigurationRepository,
} from "./connection-target-resolver";
import {
  MAGICQ_CREP_DEFAULT_PORT,
  MAGICQ_INTENSITY_CHANNEL_MAX,
  MAGICQ_INTENSITY_CHANNEL_MIN,
} from "./crep";

function normalizeConfiguration(
  configuration: MagicQConnectionConfiguration,
): MagicQConnectionConfiguration {
  const host = configuration.host.trim();
  if (!host) {
    throw new TypeError("MagicQ configuration host must be a non-empty string.");
  }

  const port = configuration.port ?? MAGICQ_CREP_DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new RangeError("MagicQ configuration port must be between 1 and 65535.");
  }

  const fixtureChannels: Record<string, number> = {};
  for (const [fixtureId, channelNumber] of Object.entries(
    configuration.fixtureChannels,
  )) {
    const normalizedFixtureId = fixtureId.trim();
    if (!normalizedFixtureId) {
      throw new TypeError("MagicQ fixture ids must be non-empty strings.");
    }
    if (
      !Number.isInteger(channelNumber) ||
      channelNumber < MAGICQ_INTENSITY_CHANNEL_MIN ||
      channelNumber > MAGICQ_INTENSITY_CHANNEL_MAX
    ) {
      throw new RangeError(
        `MagicQ channel for ${normalizedFixtureId} must be an integer between ${MAGICQ_INTENSITY_CHANNEL_MIN} and ${MAGICQ_INTENSITY_CHANNEL_MAX}.`,
      );
    }
    fixtureChannels[normalizedFixtureId] = channelNumber;
  }

  return {
    host,
    port,
    fixtureChannels,
  };
}

type MagicQConfigurationRow = {
  host: string;
  port: number;
  fixture_channels: Record<string, number> | string;
};

function parseFixtureChannels(
  value: MagicQConfigurationRow["fixture_channels"],
): Record<string, number> {
  return typeof value === "string"
    ? JSON.parse(value) as Record<string, number>
    : value;
}

/**
 * Database-backed installation configuration for a Universal Connection.
 *
 * Console/network details stay out of the static connector definition. The
 * row is scoped by connection_id and is removed automatically with the parent
 * Universal Connection.
 */
export class DatabaseMagicQConnectionConfigurationRepository
implements MagicQConnectionConfigurationRepository {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_magicq_connection_configuration (
        connection_id TEXT PRIMARY KEY
          REFERENCES clara_connections(id) ON DELETE CASCADE,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 6553,
        fixture_channels JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    this.initialized = true;
  }

  async findByConnectionId(
    connectionId: string,
  ): Promise<MagicQConnectionConfiguration | null> {
    await this.initialize();
    const rows = await sql`
      SELECT host, port, fixture_channels
      FROM clara_magicq_connection_configuration
      WHERE connection_id = ${connectionId}
      LIMIT 1
    ` as MagicQConfigurationRow[];

    const row = rows[0];
    if (!row) return null;

    return normalizeConfiguration({
      host: row.host,
      port: row.port,
      fixtureChannels: parseFixtureChannels(row.fixture_channels),
    });
  }

  async save(
    connectionId: string,
    configuration: MagicQConnectionConfiguration,
  ): Promise<void> {
    const normalized = normalizeConfiguration(configuration);
    await this.initialize();
    await sql`
      INSERT INTO clara_magicq_connection_configuration
        (connection_id, host, port, fixture_channels, updated_at)
      VALUES (
        ${connectionId},
        ${normalized.host},
        ${normalized.port},
        ${JSON.stringify(normalized.fixtureChannels)},
        NOW()
      )
      ON CONFLICT (connection_id) DO UPDATE SET
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        fixture_channels = EXCLUDED.fixture_channels,
        updated_at = NOW()
    `;
  }

  async delete(connectionId: string): Promise<void> {
    await this.initialize();
    await sql`
      DELETE FROM clara_magicq_connection_configuration
      WHERE connection_id = ${connectionId}
    `;
  }
}

export const validateMagicQConnectionConfiguration = normalizeConfiguration;
