-- DRAFT ONLY — NOT A DEPLOYABLE MIGRATION / NOT APPLIED IN NEON.
-- Review table ownership, grants, migration order, backup and tests before
-- converting this schema proposal into the next approved additive migration.
-- No grants or rows are created by PR #249.
CREATE TABLE IF NOT EXISTS clara_native_make_read_authority (
 connection_id TEXT NOT NULL REFERENCES clara_connections(id) ON DELETE CASCADE,
 owner_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
 workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
 client_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 scenario_key TEXT NOT NULL CHECK (scenario_key IN (
  'find-drive-document','check-calendar-availability','search-calendar-events')),
 revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0),
 approved_by TEXT NOT NULL REFERENCES clara_auth_users(id),
 review_reason TEXT NOT NULL CHECK (length(trim(review_reason)) BETWEEN 20 AND 2000),
 reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 revoked_at TIMESTAMPTZ,
 PRIMARY KEY (connection_id,owner_user_id,client_id,project_id,scenario_key),
 FOREIGN KEY (workspace_id,project_id,client_id)
  REFERENCES clara_registry_projects(workspace_id,id,client_id)
);
-- The active Make connection, workspace scope make:scenario:<key>, native
-- authenticated session and per-user/project grant MUST ALL be valid.
-- Revocation increments revision and sets revoked_at in a separately
-- reviewed native command; do not add a client-facing unrestricted INSERT.
-- An operator-approved provisioning command is still required, including
-- encrypted credentials and the three READ scopes. Never insert WRITE/SEND.
-- The schema proposal alone grants no authority.
