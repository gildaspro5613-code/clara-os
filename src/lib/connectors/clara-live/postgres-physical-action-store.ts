import { sql } from "@/lib/core/store/database";
import type {
  PhysicalActionProposalStore,
  StoredPhysicalActionProposal,
} from "./physical-action-store";

type ProposalRow = {
  id: string; task_id: string; owner_id: string; conversation_id: string;
  agent_id: string; connector: string; capability: string;
  parameters: Record<string, unknown>; session_id: string;
  proposed_at: string | Date; expires_at: string | Date;
};

function fromRow(row: ProposalRow): StoredPhysicalActionProposal {
  return {
    id: row.id,
    taskId: row.task_id,
    ownerId: row.owner_id,
    conversationId: row.conversation_id,
    agentId: row.agent_id,
    connector: row.connector,
    capability: row.capability,
    parameters: row.parameters,
    sessionId: row.session_id,
    status: "PROPOSED",
    proposedAt: new Date(row.proposed_at),
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * Durable proposal store. consume() is atomic and one-shot: concurrent callers
 * cannot receive the same proposal because only the UPDATE winner RETURNs it.
 */
export class PostgresPhysicalActionProposalStore implements PhysicalActionProposalStore {
  constructor(private readonly workspaceId: string) {
    if (!workspaceId.trim() || workspaceId === "default") {
      throw new Error("valid authenticated workspace is required");
    }
  }

  async create(proposal: StoredPhysicalActionProposal): Promise<void> {
    await sql`
      INSERT INTO clara_physical_action_proposals (
        id, task_id, owner_id, workspace_id, conversation_id, agent_id,
        connector, capability, parameters, session_id, proposed_at, expires_at
      ) VALUES (
        ${proposal.id}, ${proposal.taskId}, ${proposal.ownerId}, ${this.workspaceId},
        ${proposal.conversationId}, ${proposal.agentId}, ${proposal.connector},
        ${proposal.capability}, ${JSON.stringify(proposal.parameters)}::jsonb,
        ${proposal.sessionId}, ${proposal.proposedAt.toISOString()},
        ${proposal.expiresAt.toISOString()}
      )
    `;
  }

  async get(id: string): Promise<StoredPhysicalActionProposal | null> {
    const rows = await sql`
      SELECT id, task_id, owner_id, conversation_id, agent_id, connector,
             capability, parameters, session_id, proposed_at, expires_at
      FROM clara_physical_action_proposals
      WHERE id = ${id}
        AND workspace_id = ${this.workspaceId}
        AND consumed_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    ` as ProposalRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async consume(id: string): Promise<StoredPhysicalActionProposal | null> {
    const rows = await sql`
      UPDATE clara_physical_action_proposals
      SET consumed_at = NOW()
      WHERE id = ${id}
        AND workspace_id = ${this.workspaceId}
        AND consumed_at IS NULL
        AND expires_at > NOW()
      RETURNING id, task_id, owner_id, conversation_id, agent_id, connector,
                capability, parameters, session_id, proposed_at, expires_at
    ` as ProposalRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }
}
