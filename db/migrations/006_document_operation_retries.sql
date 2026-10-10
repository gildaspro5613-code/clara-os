-- Additive, immutable authorization ledger. No existing operation is reset.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_document_operation_retries (
  scope_key TEXT NOT NULL,
  operation_id TEXT NOT NULL CHECK (operation_id ~ '^[a-f0-9]{64}$'),
  parent_operation_id TEXT NOT NULL CHECK (parent_operation_id ~ '^[a-f0-9]{64}$'),
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  operator_hash TEXT NOT NULL CHECK (operator_hash ~ '^[a-f0-9]{64}$'),
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (scope_key, operation_id),
  UNIQUE (scope_key, parent_operation_id),
  FOREIGN KEY (scope_key, parent_operation_id) REFERENCES clara_document_operations(scope_key, operation_id),
  CHECK (operation_id <> parent_operation_id)
);
COMMIT;
