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

export class OrganizationConnectorRepository {
  public async listEnabled(organizationId: string): Promise<OrganizationConnectorRecord[]> {
    await ensurePersistenceSchema();

    const rows = await sql`
      SELECT organization_id, connector_id, enabled, connection_ref, metadata
      FROM organization_connectors
      WHERE organization_id = ${organizationId} AND enabled = TRUE
      ORDER BY connector_id ASC
    ` as ConnectorRow[];

    return rows.map((row) => ({
      organizationId: row.organization_id,
      connectorId: row.connector_id as NativeConnectorId,
      enabled: row.enabled,
      connectionRef: row.connection_ref ?? undefined,
      metadata: row.metadata ?? {},
    }));
  }
}
