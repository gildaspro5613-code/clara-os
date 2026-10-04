import { NextResponse } from "next/server";
import { sql } from "@/lib/core/store/database";

export const dynamic = "force-dynamic";

type NativeContactRow = {
  submission_id: string;
  email: string;
  name: string;
  project_type: string;
  lifecycle_state: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function contactsWorkspaceId(): string {
  return process.env.CLARA_MD_WORKSPACE_ID?.trim() || "melodie-digital";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const pattern = `%${query}%`;
  const workspaceId = contactsWorkspaceId();

  const rows = await sql`
    SELECT
      inbox.submission_id,
      COALESCE(inbox.intake->'contact'->>'email', '') AS email,
      COALESCE(inbox.intake->'contact'->>'name', '') AS name,
      COALESCE(inbox.intake->'request'->>'projectType', '') AS project_type,
      COALESCE(acquisition.lifecycle->>'state', 'received') AS lifecycle_state,
      inbox.created_at,
      GREATEST(inbox.updated_at, COALESCE(acquisition.updated_at, inbox.updated_at)) AS updated_at
    FROM clara_project_intake_inbox AS inbox
    LEFT JOIN clara_acquisition_records AS acquisition
      ON acquisition.workspace_id = inbox.workspace_id
     AND acquisition.submission_id = inbox.submission_id
    WHERE inbox.workspace_id = ${workspaceId}
      AND COALESCE(inbox.intake->'contact'->>'email', '') <> ''
      AND (
        ${query} = ''
        OR LOWER(COALESCE(inbox.intake->'contact'->>'email', '')) LIKE ${pattern}
        OR LOWER(COALESCE(inbox.intake->'contact'->>'name', '')) LIKE ${pattern}
        OR LOWER(COALESCE(inbox.intake->'request'->>'projectType', '')) LIKE ${pattern}
      )
    ORDER BY updated_at DESC
    LIMIT 100
  ` as NativeContactRow[];

  return NextResponse.json({
    connected: true,
    source: "clara-os",
    workspaceId,
    contacts: rows.map((row) => ({
      id: row.submission_id,
      submissionId: row.submission_id,
      email: row.email,
      name: row.name,
      projectType: row.project_type,
      lifecycleState: row.lifecycle_state,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    })),
  });
}
