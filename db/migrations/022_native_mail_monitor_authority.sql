-- Isolated, opt-in IMAP monitoring authority. No worker or SMTP privileges.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_native_mail_monitor_grants (
 connection_id TEXT PRIMARY KEY REFERENCES clara_native_mail_authority(connection_id),
 workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
 granted_by TEXT NOT NULL REFERENCES clara_auth_users(id),
 reviewed_by TEXT NOT NULL REFERENCES clara_auth_users(id),
 review_reason TEXT NOT NULL CHECK (length(review_reason) >= 20),
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 generation BIGINT NOT NULL DEFAULT 1 CHECK (generation > 0),
 revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 CHECK (NOT enabled OR revoked_at IS NULL)
);
CREATE OR REPLACE FUNCTION clara_native_mail_monitor_authority(
 requested_connection TEXT, requested_workspace TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE grant_row clara_native_mail_monitor_grants;
DECLARE authority_row clara_native_mail_authority;
BEGIN
 SELECT * INTO grant_row FROM clara_native_mail_monitor_grants
 WHERE connection_id=requested_connection AND workspace_id=requested_workspace
 FOR SHARE;
 IF NOT FOUND OR NOT grant_row.enabled OR grant_row.revoked_at IS NOT NULL THEN
  RAISE EXCEPTION 'MAIL_MONITOR_DENIED' USING ERRCODE='42501';
 END IF;
 SELECT * INTO authority_row FROM clara_native_mail_authority
 WHERE connection_id=requested_connection AND workspace_id=requested_workspace
 AND revoked_at IS NULL FOR SHARE;
 IF NOT FOUND OR NOT EXISTS (
  SELECT 1 FROM clara_connections c
  WHERE c.id=requested_connection AND c.workspace_id=requested_workspace
  AND c.provider='ionos' AND c.status='ACTIVE'
 ) OR NOT EXISTS (
  SELECT 1 FROM clara_workspace_memberships m
  WHERE m.workspace_id=requested_workspace AND m.user_id=authority_row.owner_user_id
  AND m.revoked_at IS NULL
 ) THEN RAISE EXCEPTION 'MAIL_MONITOR_DENIED' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('connectionId',authority_row.connection_id,
  'workspaceId',authority_row.workspace_id,'address',authority_row.address,
  'authorityRevision',authority_row.revision,'generation',grant_row.generation);
END $$;
REVOKE ALL ON FUNCTION clara_native_mail_monitor_authority(TEXT,TEXT) FROM PUBLIC;
-- No grants are seeded and no worker role is granted EXECUTE.
COMMIT;
