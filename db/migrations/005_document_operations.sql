-- Additive registry. No source documents or credentials are stored here.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_document_operations (
  scope_key TEXT NOT NULL CHECK (scope_key ~ '^[a-f0-9]{64}$'),
  operation_id TEXT NOT NULL CHECK (operation_id ~ '^[a-f0-9]{64}$'),
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  owner_token UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing','completed','failed','uncertain','expired')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (scope_key, operation_id),
  CHECK ((status = 'completed') = (result IS NOT NULL)),
  CHECK (status <> 'completed' OR expires_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS clara_document_operations_expiry_idx
  ON clara_document_operations (expires_at) WHERE status = 'completed';
COMMIT;
