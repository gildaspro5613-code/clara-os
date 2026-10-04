import { sql } from "@/lib/core/store/database";
import { loadAcquisitionRecord } from "@/lib/acquisition/acquisition-store";
import { loadSession } from "@/lib/core/store/session-store";

interface InboxTraceRow {
  workspace_id: string;
  submission_id: string;
  product_id: string;
  session_key: string;
  event_id: string;
  status: string;
  error: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export async function traceProspectE2E(workspaceId: string, submissionId: string) {
  const rows = await sql`
    SELECT workspace_id, submission_id, product_id, session_key, event_id,
           status, error, created_at, updated_at
    FROM clara_project_intake_inbox
    WHERE workspace_id = ${workspaceId} AND submission_id = ${submissionId}
    LIMIT 1
  ` as InboxTraceRow[];

  const inbox = rows[0] ?? null;
  const acquisition = await loadAcquisitionRecord(workspaceId, submissionId);
  const session = inbox ? await loadSession(inbox.session_key) : null;

  return {
    workspaceId,
    submissionId,
    inbox: inbox ? {
      found: true,
      productId: inbox.product_id,
      sessionKey: inbox.session_key,
      eventId: inbox.event_id,
      status: inbox.status,
      error: inbox.error,
      createdAt: new Date(inbox.created_at),
      updatedAt: new Date(inbox.updated_at),
    } : { found: false },
    acquisition: acquisition ? {
      found: true,
      qualification: acquisition.qualification,
      decisionBrief: acquisition.decisionBrief,
      lifecycle: acquisition.lifecycle,
      createdAt: acquisition.createdAt,
      updatedAt: acquisition.updatedAt,
    } : { found: false },
    session: session ? {
      found: true,
      mission: session.mission ?? null,
      updatedAt: session.updatedAt,
    } : { found: false },
  };
}
