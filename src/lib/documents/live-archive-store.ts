import { sql } from "@/lib/core/store/database";
import {
  parseLiveArchiveReference,
  type LiveArchiveReference,
} from "./live-archive-reference";

type ArchiveRow = { project_id: string; archive_record: LiveArchiveReference };
export type ArchiveQuery = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<ArchiveRow[]>;
export class LiveArchiveConflictError extends Error {}

export function createLiveArchiveStore(query: ArchiveQuery) {
  let schemaReady: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    if (!schemaReady) {
      schemaReady = query`
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
      `.then(async () => {
        // A Live project cannot change client identity through a second archive key.
        // Existing contradictory rows block activation rather than being deleted.
        await query`CREATE UNIQUE INDEX IF NOT EXISTS clara_live_archive_project_identity
          ON clara_live_archive_references (workspace_id, live_project_id)`;
      }).catch((error: unknown) => {
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
  async function saveLiveArchiveReference(input: unknown): Promise<LiveArchiveReference> {
    const record = parseLiveArchiveReference(input);
    await ensureSchema();
    let rows: ArchiveRow[];
    try { rows = await query`
      INSERT INTO clara_live_archive_references (
        workspace_id, client_id, live_project_id, project_id, archive_record
      ) VALUES (
        ${record.workspaceId}, ${record.clientId}, ${record.liveProjectId},
        ${record.projectId}, ${JSON.stringify(record)}::jsonb
      )
      ON CONFLICT (workspace_id, client_id, live_project_id)
      DO NOTHING
      RETURNING project_id, archive_record
    ` as ArchiveRow[];
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        throw new LiveArchiveConflictError("Conflicting Clara Live archive identity");
      }
      throw error;
    }
    const existing = rows.length ? rows : await query`
      SELECT project_id, archive_record
      FROM clara_live_archive_references
      WHERE workspace_id = ${record.workspaceId}
        AND client_id = ${record.clientId}
        AND live_project_id = ${record.liveProjectId}
      LIMIT 1
    ` as Array<{ project_id: string; archive_record: LiveArchiveReference }>;
    const stored = existing[0];
    if (!stored || stored.project_id !== record.projectId) {
      throw new LiveArchiveConflictError("Conflicting Clara Live archive project identity");
    }
    const persisted = parseLiveArchiveReference(stored.archive_record);
    if (JSON.stringify(persisted) !== JSON.stringify(record)) {
      throw new LiveArchiveConflictError("Archive reference already exists with different immutable content");
    }
    return persisted;
  }

  /**
   * Workspace- and client-scoped lookup. Never expose unscoped archive queries.
   * The caller must verify authorization for both identifiers.
   */
  async function listLiveArchiveReferences(
    workspaceId: string,
    clientId: string,
    limit = 100,
  ): Promise<LiveArchiveReference[]> {
    if (!workspaceId.trim() || !clientId.trim() || !Number.isFinite(limit)) throw new Error("Archive scope and finite limit required");
    await ensureSchema();
    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
    const rows = await query`
      SELECT archive_record
      FROM clara_live_archive_references
      WHERE workspace_id = ${workspaceId} AND client_id = ${clientId}
      ORDER BY created_at DESC
      LIMIT ${safeLimit}
    ` as Array<{ archive_record: LiveArchiveReference }>;
    return rows.map(row => parseLiveArchiveReference(row.archive_record));
  }

  return { saveLiveArchiveReference, listLiveArchiveReferences };
}
const store = createLiveArchiveStore(sql);
export const { saveLiveArchiveReference, listLiveArchiveReferences } = store;
