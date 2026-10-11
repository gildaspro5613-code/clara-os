import { sql } from "@/lib/core/store/database";
import {
  parseLiveArchiveReference,
  type LiveArchiveReference,
} from "./live-archive-reference";

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS clara_live_archive_references (
        workspace_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        live_project_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        archive_record JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspace_id, client_id, live_project_id)
      )
    `.then(() => undefined).catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

/**
 * Persists an OS-side archive reference. Never mutates a Clara Live project.
 * Callers MUST authorize the workspace and client before invoking this store.
 * Replays are idempotent; conflicting project identities fail closed.
 */
export async function saveLiveArchiveReference(input: unknown): Promise<LiveArchiveReference> {
  const record = parseLiveArchiveReference(input);
  await ensureSchema();
  const rows = await sql`
    INSERT INTO clara_live_archive_references (
      workspace_id, client_id, live_project_id, project_id, archive_record
    ) VALUES (
      ${record.workspaceId}, ${record.clientId}, ${record.liveProjectId},
      ${record.projectId}, ${JSON.stringify(record)}::jsonb
    )
    ON CONFLICT (workspace_id, client_id, live_project_id)
    DO UPDATE SET
      updated_at = CASE
        WHEN clara_live_archive_references.project_id = EXCLUDED.project_id
          THEN clara_live_archive_references.updated_at
        ELSE clara_live_archive_references.updated_at
      END
    RETURNING project_id, archive_record
  ` as Array<{ project_id: string; archive_record: LiveArchiveReference }>;
  const stored = rows[0];
  if (!stored || stored.project_id !== record.projectId) {
    throw new Error("Conflicting Clara Live archive project identity");
  }
  return parseLiveArchiveReference(stored.archive_record);
}

/**
 * Workspace- and client-scoped lookup. Never expose unscoped archive queries.
 * The caller must verify authorization for both identifiers.
 */
export async function listLiveArchiveReferences(
  workspaceId: string,
  clientId: string,
  limit = 100,
): Promise<LiveArchiveReference[]> {
  if (!workspaceId.trim() || !clientId.trim()) throw new Error("Archive scope required");
  await ensureSchema();
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const rows = await sql`
    SELECT archive_record
    FROM clara_live_archive_references
    WHERE workspace_id = ${workspaceId} AND client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  ` as Array<{ archive_record: LiveArchiveReference }>;
  return rows.map(row => parseLiveArchiveReference(row.archive_record));
}
