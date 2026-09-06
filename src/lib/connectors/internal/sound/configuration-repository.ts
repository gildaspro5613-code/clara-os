import { sql } from "@/lib/core/store/database";
import type { SoundConsoleProvider } from "./console-foundations";

export type SoundConsoleConfiguration = {
  connectionId: string;
  provider: SoundConsoleProvider;
  host: string;
  port: number;
  transport: string;
};

type SoundConsoleConfigurationRow = {
  connection_id: string;
  provider: SoundConsoleProvider;
  host: string;
  port: number;
  transport: string;
};

export class DatabaseSoundConsoleConfigurationRepository {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_sound_console_configurations (
        connection_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL,
        transport TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    this.initialized = true;
  }

  async save(configuration: SoundConsoleConfiguration): Promise<void> {
    await this.initialize();
    await sql`
      INSERT INTO clara_sound_console_configurations
        (connection_id, provider, host, port, transport, updated_at)
      VALUES
        (${configuration.connectionId}, ${configuration.provider}, ${configuration.host},
         ${configuration.port}, ${configuration.transport}, NOW())
      ON CONFLICT (connection_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        host = EXCLUDED.host,
        port = EXCLUDED.port,
        transport = EXCLUDED.transport,
        updated_at = NOW()
    `;
  }

  async find(connectionId: string): Promise<SoundConsoleConfiguration | null> {
    await this.initialize();
    const rows = await sql`
      SELECT connection_id, provider, host, port, transport
      FROM clara_sound_console_configurations
      WHERE connection_id = ${connectionId}
      LIMIT 1
    ` as SoundConsoleConfigurationRow[];
    const row = rows[0];
    return row
      ? {
          connectionId: row.connection_id,
          provider: row.provider,
          host: row.host,
          port: row.port,
          transport: row.transport,
        }
      : null;
  }
}
