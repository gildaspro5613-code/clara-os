-- Durable one-shot storage for Clara physical action proposals.
-- This migration stores proposals only; it grants no execution authority.
BEGIN;

CREATE TABLE IF NOT EXISTS clara_physical_action_proposals (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES clara_auth_users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  connector TEXT NOT NULL,
  capability TEXT NOT NULL,
  parameters JSONB NOT NULL,
  session_id TEXT NOT NULL,
  proposed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT clara_physical_proposal_expiry CHECK (expires_at > proposed_at)
);

CREATE INDEX IF NOT EXISTS clara_physical_action_active_idx
  ON clara_physical_action_proposals (owner_id, workspace_id, conversation_id, expires_at)
  WHERE consumed_at IS NULL;

COMMIT;
