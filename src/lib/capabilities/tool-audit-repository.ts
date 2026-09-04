import { sql } from "@/lib/core/store/database";

export type ToolAuditStatus = "REQUESTED" | "DENIED" | "SUCCEEDED" | "FAILED";

export interface ToolAuditEvent {
  readonly callId: string;
  readonly capabilityId: string;
  readonly actorId: string;
  readonly workspaceId: string;
  readonly status: ToolAuditStatus;
  readonly message?: string;
}

export interface ToolAuditWriter {
  record(event: ToolAuditEvent): Promise<void>;
}

export class DatabaseToolAuditRepository implements ToolAuditWriter {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_tool_audit (
        id TEXT PRIMARY KEY,
        call_id TEXT NOT NULL,
        capability_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    this.initialized = true;
  }

  async record(event: ToolAuditEvent): Promise<void> {
    await this.initialize();
    await sql`
      INSERT INTO clara_tool_audit
        (id, call_id, capability_id, actor_id, workspace_id, status, message)
      VALUES
        (${crypto.randomUUID()}, ${event.callId}, ${event.capabilityId},
         ${event.actorId}, ${event.workspaceId}, ${event.status}, ${event.message ?? null})
    `;
  }
}
