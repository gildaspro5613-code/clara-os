-- One-time server-side sign-in transactions. No provider is activated by this migration.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_auth_sign_in_transactions (
  state_hash CHAR(64) PRIMARY KEY CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  provider TEXT NOT NULL CHECK (length(trim(provider)) > 0),
  nonce_hash CHAR(64) NOT NULL CHECK (nonce_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT clara_sign_in_expiry_after_creation CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS clara_sign_in_transactions_expiry_idx
  ON clara_auth_sign_in_transactions (expires_at);
COMMIT;
