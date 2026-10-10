-- Additive. Apply explicitly after backup/TEST validation, never on startup.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_external_event_jobs (
  job_id text PRIMARY KEY CHECK (job_id ~ '^[a-f0-9]{64}$'),
  scope_key text NOT NULL,
  product_id text NOT NULL,
  os_workspace_id text NOT NULL,
  fingerprint text NOT NULL,
  request jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','uncertain','expired')),
  phase text NOT NULL DEFAULT 'queued',
  owner_token uuid,
  correlation_id text NOT NULL CHECK (correlation_id ~ '^[a-f0-9]{32}$'),
  result jsonb,
  failure_code text,
  failure_category text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  started_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT clock_timestamp() + interval '30 days',
  CHECK ((status = 'completed') = (result IS NOT NULL)),
  CHECK (status != 'queued' OR owner_token IS NULL)
);
-- Serialize cognitive work per authenticated session, including ambiguous owners.
CREATE UNIQUE INDEX IF NOT EXISTS clara_event_jobs_session_owner
  ON clara_external_event_jobs(scope_key) WHERE status IN ('processing','uncertain');
CREATE INDEX IF NOT EXISTS clara_event_jobs_queue ON clara_external_event_jobs(created_at) WHERE status = 'queued';

COMMIT;
