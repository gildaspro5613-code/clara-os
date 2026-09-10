import { randomUUID } from "node:crypto";

import { sql } from "@/lib/core/store/database";
import { ensurePersistenceSchema } from "@/lib/persistence/ensure-schema";

export type ConnectionAccountStatus =
  | "pending"
  | "connected"
  | "error"
  | "disconnected";

export interface ConnectionAccountRecord {
  id: string;
  organizationId: string;
  providerId: string;
  label?: string;
  status: ConnectionAccountStatus;
  credentialRef?: string;
  metadata: Record<string, unknown>;
}

interface ConnectionAccountRow {
  id: string;
  organization_id: string;
  provider_id: string;
  label: string | null;
  status: ConnectionAccountStatus;
  credential_ref: string | null;
  metadata: Record<string, unknown> | null;
}

function mapRow(row: ConnectionAccountRow): ConnectionAccountRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerId: row.provider_id,
    label: row.label ?? undefined,
    status: row.status,
    credentialRef: row.credential_ref ?? undefined,
    metadata: row.metadata ?? {},
  };
}

export class ConnectionAccountRepository {
  public async listForOrganization(organizationId: string): Promise<ConnectionAccountRecord[]> {
    await ensurePersistenceSchema();
    const rows = await sql`
      SELECT id, organization_id, provider_id, label, status, credential_ref, metadata
      FROM connection_accounts
      WHERE organization_id = ${organizationId}
      ORDER BY provider_id ASC, created_at ASC
    ` as ConnectionAccountRow[];
    return rows.map(mapRow);
  }

  public async createPending(input: {
    organizationId: string;
    providerId: string;
    label?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ConnectionAccountRecord> {
    await ensurePersistenceSchema();

    await sql`
      INSERT INTO organizations (id, updated_at)
      VALUES (${input.organizationId}, NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `;

    const id = randomUUID();
    const metadata = JSON.stringify(input.metadata ?? {});
    const rows = await sql`
      INSERT INTO connection_accounts (
        id, organization_id, provider_id, label, status, metadata, updated_at
      ) VALUES (
        ${id}, ${input.organizationId}, ${input.providerId}, ${input.label ?? null},
        'pending', ${metadata}::jsonb, NOW()
      )
      RETURNING id, organization_id, provider_id, label, status, credential_ref, metadata
    ` as ConnectionAccountRow[];

    return mapRow(rows[0]);
  }

  public async markConnected(input: {
    id: string;
    organizationId: string;
    credentialRef: string;
    metadata?: Record<string, unknown>;
  }): Promise<ConnectionAccountRecord | undefined> {
    await ensurePersistenceSchema();
    const metadata = JSON.stringify(input.metadata ?? {});
    const rows = await sql`
      UPDATE connection_accounts
      SET status = 'connected', credential_ref = ${input.credentialRef},
          metadata = ${metadata}::jsonb, updated_at = NOW()
      WHERE id = ${input.id} AND organization_id = ${input.organizationId}
      RETURNING id, organization_id, provider_id, label, status, credential_ref, metadata
    ` as ConnectionAccountRow[];
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  public async markDisconnected(
    id: string,
    organizationId: string,
  ): Promise<ConnectionAccountRecord | undefined> {
    await ensurePersistenceSchema();
    const rows = await sql`
      UPDATE connection_accounts
      SET status = 'disconnected', credential_ref = NULL, updated_at = NOW()
      WHERE id = ${id} AND organization_id = ${organizationId}
      RETURNING id, organization_id, provider_id, label, status, credential_ref, metadata
    ` as ConnectionAccountRow[];
    return rows[0] ? mapRow(rows[0]) : undefined;
  }
}
