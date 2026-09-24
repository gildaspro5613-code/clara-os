-- Identity mapping is populated only by a server-side verified sign-in adapter.
-- No public API may provision identities from caller-supplied claims.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_auth_identities (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES clara_auth_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (issuer, subject),
  CONSTRAINT clara_identity_issuer_not_empty CHECK (length(trim(issuer)) > 0),
  CONSTRAINT clara_identity_subject_not_empty CHECK (length(trim(subject)) > 0)
);
CREATE INDEX IF NOT EXISTS clara_auth_identities_user_idx
  ON clara_auth_identities(user_id);
COMMIT;
