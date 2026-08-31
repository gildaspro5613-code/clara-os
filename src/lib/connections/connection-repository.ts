import { sql } from "@/lib/core/store/database";
import {
  ConnectionStatus,
  type Connection,
} from "./connection";

export interface ConnectionRepository {
  findById(connectionId: string): Promise<Connection | null>;
  findByWorkspaceAndProvider(
    workspaceId: string,
    provider: string,
  ): Promise<Connection | null>;
  save(connection: Connection): Promise<void>;
  updateStatus(
    connectionId: string,
    status: Connection["status"],
  ): Promise<void>;
}

type ConnectionRow = {
  id: string;
  workspace_id: string;
  provider: string;
  status: Connection["status"];
  scopes: string[];
  created_at: Date | string;
  updated_at: Date | string;
};

function fromRow(row: ConnectionRow): Connection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    status: row.status,
    scopes: row.scopes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class DatabaseConnectionRepository
implements ConnectionRepository {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_connections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (workspace_id, provider)
      )
    `;
    this.initialized = true;
  }

  async findById(connectionId: string): Promise<Connection | null> {
    await this.initialize();
    const rows = await sql`
      SELECT id, workspace_id, provider, status, scopes, created_at, updated_at
      FROM clara_connections WHERE id = ${connectionId} LIMIT 1
    ` as ConnectionRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async findByWorkspaceAndProvider(
    workspaceId: string,
    provider: string,
  ): Promise<Connection | null> {
    await this.initialize();
    const rows = await sql`
      SELECT id, workspace_id, provider, status, scopes, created_at, updated_at
      FROM clara_connections
      WHERE workspace_id = ${workspaceId} AND provider = ${provider}
      LIMIT 1
    ` as ConnectionRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async save(connection: Connection): Promise<void> {
    await this.initialize();
    await sql`
      INSERT INTO clara_connections
        (id, workspace_id, provider, status, scopes, created_at, updated_at)
      VALUES
        (${connection.id}, ${connection.workspaceId}, ${connection.provider},
         ${connection.status}, ${JSON.stringify(connection.scopes)},
         ${connection.createdAt}, ${connection.updatedAt})
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        scopes = EXCLUDED.scopes,
        updated_at = EXCLUDED.updated_at
    `;
  }

  async updateStatus(
    connectionId: string,
    status: Connection["status"],
  ): Promise<void> {
    await this.initialize();
    await sql`
      UPDATE clara_connections
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${connectionId}
    `;
  }
}

export function createPendingGoogleConnection(
  workspaceId: string,
  scopes: string[],
): Connection {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    workspaceId,
    provider: "google",
    status: ConnectionStatus.PENDING_AUTHENTICATION,
    scopes,
    createdAt: now,
    updatedAt: now,
  };
}
