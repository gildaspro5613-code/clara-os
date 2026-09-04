import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import type { CapabilityExecutionPrincipal } from "./capability-policy";

export interface ToolApprovalRequest {
  readonly id: string;
  readonly token: string;
  readonly capabilityId: string;
  readonly summary: string;
  readonly expiresAt: string;
}

export interface ConsumableToolApproval {
  readonly id: string;
  readonly callId: string;
  readonly capabilityId: string;
  readonly arguments: string;
}

export interface ToolApprovalWriter {
  create(input: {
    callId: string;
    capabilityId: string;
    arguments: string;
    principal: CapabilityExecutionPrincipal;
  }): Promise<ToolApprovalRequest>;
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export class DatabaseToolApprovalRepository implements ToolApprovalWriter {
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await sql`
      CREATE TABLE IF NOT EXISTS clara_tool_approvals (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        call_id TEXT NOT NULL,
        capability_id TEXT NOT NULL,
        arguments TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `;
    this.initialized = true;
  }

  async create(input: {
    callId: string;
    capabilityId: string;
    arguments: string;
    principal: CapabilityExecutionPrincipal;
  }): Promise<ToolApprovalRequest> {
    await this.initialize();
    const id = crypto.randomUUID();
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sql`
      INSERT INTO clara_tool_approvals
        (id, token_hash, call_id, capability_id, arguments, actor_id, workspace_id, expires_at)
      VALUES
        (${id}, ${hashToken(token)}, ${input.callId}, ${input.capabilityId},
         ${input.arguments}, ${input.principal.actorId}, ${input.principal.workspaceId}, ${expiresAt})
    `;
    return {
      id,
      token,
      capabilityId: input.capabilityId,
      summary: `Autoriser Clara à exécuter ${input.capabilityId}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async consume(
    id: string,
    token: string,
    principal: CapabilityExecutionPrincipal,
  ): Promise<ConsumableToolApproval | null> {
    await this.initialize();
    const rows = await sql`
      UPDATE clara_tool_approvals
      SET status = 'PROCESSING'
      WHERE id = ${id}
        AND token_hash = ${hashToken(token)}
        AND actor_id = ${principal.actorId}
        AND workspace_id = ${principal.workspaceId}
        AND status = 'PENDING'
        AND expires_at > NOW()
      RETURNING id, call_id, capability_id, arguments
    ` as Array<{ id: string; call_id: string; capability_id: string; arguments: string }>;
    const row = rows[0];
    return row ? {
      id: row.id,
      callId: row.call_id,
      capabilityId: row.capability_id,
      arguments: row.arguments,
    } : null;
  }

  async complete(id: string, success: boolean): Promise<void> {
    await this.initialize();
    await sql`
      UPDATE clara_tool_approvals
      SET status = ${success ? "SUCCEEDED" : "FAILED"}, completed_at = NOW()
      WHERE id = ${id} AND status = 'PROCESSING'
    `;
  }

  async reject(
    id: string,
    token: string,
    principal: CapabilityExecutionPrincipal,
  ): Promise<boolean> {
    await this.initialize();
    const rows = await sql`
      UPDATE clara_tool_approvals
      SET status = 'REJECTED', completed_at = NOW()
      WHERE id = ${id}
        AND token_hash = ${hashToken(token)}
        AND actor_id = ${principal.actorId}
        AND workspace_id = ${principal.workspaceId}
        AND status = 'PENDING'
        AND expires_at > NOW()
      RETURNING id
    ` as Array<{ id: string }>;
    return rows.length === 1;
  }
}
