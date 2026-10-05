import { sql } from "@/lib/core/store/database";
import type { AcquisitionDecisionBrief } from "./decision-brief";
import type { AcquisitionLifecycle } from "./lifecycle";
import type { AcquisitionQualification } from "./qualification";
import type { CommercialCommunicationDraft } from "./commercial-communication-draft";

export interface AcquisitionRecord {
  submissionId: string;
  workspaceId: string;
  qualification: AcquisitionQualification;
  decisionBrief: AcquisitionDecisionBrief;
  lifecycle: AcquisitionLifecycle;
  commercialDraft?: CommercialCommunicationDraft | null;
  createdAt: Date;
  updatedAt: Date;
}

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = sql`
      CREATE TABLE IF NOT EXISTS clara_acquisition_records (
        submission_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        qualification JSONB NOT NULL,
        decision_brief JSONB NOT NULL,
        lifecycle JSONB NOT NULL,
        commercial_draft JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspace_id, submission_id)
      )
    `.then(async () => {
      await sql`ALTER TABLE clara_acquisition_records ADD COLUMN IF NOT EXISTS commercial_draft JSONB`;
    }).catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function saveAcquisitionRecord(input: {
  workspaceId: string;
  qualification: AcquisitionQualification;
  decisionBrief: AcquisitionDecisionBrief;
  lifecycle: AcquisitionLifecycle;
  preserveLifecycle?: boolean;
}): Promise<void> {
  await ensureSchema();

  if (input.preserveLifecycle) {
    await sql`
      INSERT INTO clara_acquisition_records (
        submission_id, workspace_id, qualification, decision_brief, lifecycle, updated_at
      )
      VALUES (
        ${input.qualification.submissionId},
        ${input.workspaceId},
        ${JSON.stringify(input.qualification)},
        ${JSON.stringify(input.decisionBrief)},
        ${JSON.stringify(input.lifecycle)},
        NOW()
      )
      ON CONFLICT (workspace_id, submission_id)
      DO UPDATE SET
        qualification = EXCLUDED.qualification,
        decision_brief = EXCLUDED.decision_brief,
        lifecycle = clara_acquisition_records.lifecycle,
        updated_at = NOW()
    `;
    return;
  }

  await sql`
    INSERT INTO clara_acquisition_records (
      submission_id, workspace_id, qualification, decision_brief, lifecycle, updated_at
    )
    VALUES (
      ${input.qualification.submissionId},
      ${input.workspaceId},
      ${JSON.stringify(input.qualification)},
      ${JSON.stringify(input.decisionBrief)},
      ${JSON.stringify(input.lifecycle)},
      NOW()
    )
    ON CONFLICT (workspace_id, submission_id)
    DO UPDATE SET
      qualification = EXCLUDED.qualification,
      decision_brief = EXCLUDED.decision_brief,
      lifecycle = EXCLUDED.lifecycle,
      updated_at = NOW()
  `;
}

function mapRecord(row: {
  submission_id: string;
  workspace_id: string;
  qualification: AcquisitionQualification;
  decision_brief: AcquisitionDecisionBrief;
  lifecycle: AcquisitionLifecycle;
  commercial_draft: CommercialCommunicationDraft | null;
  created_at: string | Date;
  updated_at: string | Date;
}): AcquisitionRecord {
  return {
    submissionId: row.submission_id,
    workspaceId: row.workspace_id,
    qualification: row.qualification,
    decisionBrief: row.decision_brief,
    lifecycle: row.lifecycle,
    commercialDraft: row.commercial_draft ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function loadAcquisitionRecord(
  workspaceId: string,
  submissionId: string,
): Promise<AcquisitionRecord | null> {
  await ensureSchema();
  const rows = await sql`
    SELECT submission_id, workspace_id, qualification, decision_brief, lifecycle, commercial_draft, created_at, updated_at
    FROM clara_acquisition_records
    WHERE workspace_id = ${workspaceId} AND submission_id = ${submissionId}
    LIMIT 1
  ` as Array<{
    submission_id: string;
    workspace_id: string;
    qualification: AcquisitionQualification;
    decision_brief: AcquisitionDecisionBrief;
    lifecycle: AcquisitionLifecycle;
    commercial_draft: CommercialCommunicationDraft | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>;

  const row = rows[0];
  return row ? mapRecord(row) : null;
}

export async function loadAcquisitionDecisionQueue(
  workspaceId: string,
): Promise<AcquisitionRecord[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT submission_id, workspace_id, qualification, decision_brief, lifecycle, commercial_draft, created_at, updated_at
    FROM clara_acquisition_records
    WHERE workspace_id = ${workspaceId}
      AND lifecycle->>'decisionRequired' = 'true'
    ORDER BY updated_at DESC
  ` as Array<{
    submission_id: string;
    workspace_id: string;
    qualification: AcquisitionQualification;
    decision_brief: AcquisitionDecisionBrief;
    lifecycle: AcquisitionLifecycle;
    commercial_draft: CommercialCommunicationDraft | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>;

  return rows.map(mapRecord);
}

export async function loadActiveAcquisitionQualifications(
  workspaceId: string,
): Promise<AcquisitionRecord[]> {
  await ensureSchema();
  const rows = await sql`
    SELECT submission_id, workspace_id, qualification, decision_brief, lifecycle, commercial_draft, created_at, updated_at
    FROM clara_acquisition_records
    WHERE workspace_id = ${workspaceId}
      AND lifecycle->>'state' = 'qualifying'
    ORDER BY updated_at DESC
  ` as Array<{
    submission_id: string;
    workspace_id: string;
    qualification: AcquisitionQualification;
    decision_brief: AcquisitionDecisionBrief;
    lifecycle: AcquisitionLifecycle;
    commercial_draft: CommercialCommunicationDraft | null;
    created_at: string | Date;
    updated_at: string | Date;
  }>;

  return rows.map(mapRecord);
}

export async function saveCommercialDraft(
  workspaceId: string,
  submissionId: string,
  draft: CommercialCommunicationDraft,
): Promise<CommercialCommunicationDraft | null> {
  await ensureSchema();
  const rows = await sql`
    UPDATE clara_acquisition_records
    SET commercial_draft = ${JSON.stringify(draft)}, updated_at = NOW()
    WHERE workspace_id = ${workspaceId} AND submission_id = ${submissionId}
    RETURNING commercial_draft
  ` as Array<{ commercial_draft: CommercialCommunicationDraft }>;
  return rows[0]?.commercial_draft ?? null;
}
