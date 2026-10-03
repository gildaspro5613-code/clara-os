import { sql } from "@/lib/core/store/database";
import type { MdProjectIntake } from "@/types";

export type ProjectIntakeInboxStatus = "received" | "processing" | "processed" | "failed";

export interface ProjectIntakeInboxItem {
  workspaceId: string;
  submissionId: string;
  productId: string;
  sessionKey: string;
  eventId: string;
  intake: MdProjectIntake;
}

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS clara_project_intake_inbox (
        workspace_id TEXT NOT NULL,
        submission_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        session_key TEXT NOT NULL,
        event_id TEXT NOT NULL,
        intake JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'received',
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspace_id, submission_id)
      )
    `.then(() => undefined).catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function persistProjectIntake(input: {
  workspaceId: string;
  submissionId: string;
  productId: string;
  sessionKey: string;
  eventId: string;
  intake: MdProjectIntake;
}): Promise<void> {
  await ensureSchema();
  await sql`
    INSERT INTO clara_project_intake_inbox (
      workspace_id, submission_id, product_id, session_key, event_id, intake, status, error, updated_at
    )
    VALUES (
      ${input.workspaceId},
      ${input.submissionId},
      ${input.productId},
      ${input.sessionKey},
      ${input.eventId},
      ${JSON.stringify(input.intake)},
      'received',
      NULL,
      NOW()
    )
    ON CONFLICT (workspace_id, submission_id)
    DO NOTHING
  `;
}

export async function claimProjectIntakes(
  limit: number,
  staleAfterSeconds: number,
): Promise<ProjectIntakeInboxItem[]> {
  await ensureSchema();
  const rows = await sql`
    WITH candidates AS (
      SELECT workspace_id, submission_id
      FROM clara_project_intake_inbox
      WHERE status = 'received'
         OR (status = 'processing' AND updated_at < NOW() - (${staleAfterSeconds} * INTERVAL '1 second'))
      ORDER BY created_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE clara_project_intake_inbox AS inbox
    SET status = 'processing', error = NULL, updated_at = NOW()
    FROM candidates
    WHERE inbox.workspace_id = candidates.workspace_id
      AND inbox.submission_id = candidates.submission_id
    RETURNING inbox.workspace_id, inbox.submission_id, inbox.product_id,
              inbox.session_key, inbox.event_id, inbox.intake
  `;

  return rows.map((row) => ({
    workspaceId: String(row.workspace_id),
    submissionId: String(row.submission_id),
    productId: String(row.product_id),
    sessionKey: String(row.session_key),
    eventId: String(row.event_id),
    intake: row.intake as MdProjectIntake,
  }));
}

export async function markProjectIntakeStatus(
  workspaceId: string,
  submissionId: string,
  status: ProjectIntakeInboxStatus,
  error?: string,
): Promise<void> {
  await ensureSchema();
  await sql`
    UPDATE clara_project_intake_inbox
    SET status = ${status}, error = ${error ?? null}, updated_at = NOW()
    WHERE workspace_id = ${workspaceId} AND submission_id = ${submissionId}
  `;
}
