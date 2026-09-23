-- Clara OS: authenticated identities and isolated workspace memberships.
-- Apply only after the sign-in/identity provisioning flow has been reviewed.
-- No default user, workspace, membership or session is created here.
-- Existing legacy Clara runtime tables are intentionally untouched.

BEGIN;

CREATE TABLE IF NOT EXISTS clara_auth_users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clara_auth_workspaces (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clara_auth_workspace_not_legacy CHECK (id <> 'default')
);

CREATE TABLE IF NOT EXISTS clara_workspace_memberships (
  user_id TEXT NOT NULL REFERENCES clara_auth_users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS clara_memberships_workspace_active_idx
  ON clara_workspace_memberships (workspace_id, user_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS clara_auth_sessions (
  token_hash CHAR(64) PRIMARY KEY CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  user_id TEXT NOT NULL REFERENCES clara_auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT clara_session_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS clara_auth_sessions_user_active_idx
  ON clara_auth_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

COMMIT;
