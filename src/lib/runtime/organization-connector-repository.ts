import { sql } from "@/lib/core/store/database";
import { ensurePersistenceSchema } from "@/lib/persistence/ensure-schema";
import type { NativeConnectorId } from "./native-connector-resolver";

export interface OrganizationConnectorRecord {
  organizationId: string;
  connectorId: NativeConnectorId;
  enabled: boolean;
  connectionRef?: string;
  metadata: Record<string, unknown>;
}

interface ConnectorRow {
  organization_id: string;
  connector_id: string;
  enabled: boolean;
  connection_ref: string | null;
  metadata: Record<string, unknown> | null;
}

function mapRow(row: ConnectorRow): OrganizationConnectorRecord {
  return {
    organizationId: row.organization_id,
    connectorId: row.connector_id as NativeConnectorId,
    enabled: row.enabled,
    connectionRef: row.connection_ref ?? undefined,
    metadata: row.metadata ?? {},
  };
}

export class OrganizationConnectorRepository {
  public async list(organizationId: string): Promise<OrganizationConnectorRecord[]> {
    await ensurePersistenceSchema();
    const rows = await sql`
      SELECT organization_id, connector_id, enabled, connection_ref, metadata
      FROM organization_connectors
      WHERE organization_id = ${organizationId}
      ORDER BY connector_id ASC
    ` as ConnectorRow[];
    return rows.map(mapRow);
  }

  public async listEnabled(organizationId: string): Promise<OrganizationConnectorRecord[]> {
    const records = await this.list(organizationId);
    return records.filter((record) => record.enabled);
  }

  public async upsert(record: OrganizationConnectorRecord): Promise<OrganizationConnectorRecord> {
    await ensurePersistenceSchema();

    await sql`
      INSERT INTO organizations (id, updated_at)
      VALUES (${record.organizationId}, NOW())
      ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
    `;

    const metadata = JSON.stringify(record.metadata ?? {});
    const rows = await sql`
      INSERT INTO organization_connectors (
        organization_id, connector_id, enabled, connection_ref, metadata, updated_at
      ) VALUES (
        ${record.organizationId}, ${record.connectorId}, ${record.enabled},
        ${record.connectionRef ?? null}, ${metadata}::jsonb, NOW()
      )
      ON CONFLICT (organization_id, connector_id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        connection_ref = EXCLUDED.connection_ref,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING organization_id, connector_id, enabled, connection_ref, metadata
    ` as ConnectorRow[];

    return mapRow(rows[0]);
  }
}
