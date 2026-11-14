-- Additive, reviewed deployment only. No backfill and no business data changes.
BEGIN;
-- Existing legacy stores; empty initialization only when absent, never backfill.
CREATE TABLE IF NOT EXISTS clara_sessions(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS clara_missions(id TEXT PRIMARY KEY,data JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS clara_native_resource_authority (
  binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_kind TEXT NOT NULL CHECK (resource_kind IN ('session','mission','document')),
  resource_id TEXT NOT NULL CHECK (length(resource_id) BETWEEN 1 AND 512 AND resource_id <> 'default'),
  owner_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
  workspace_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL CHECK (snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  reviewed_by TEXT NOT NULL REFERENCES clara_auth_users(id),
  review_reason TEXT NOT NULL CHECK (length(trim(review_reason)) BETWEEN 20 AND 2000),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  FOREIGN KEY(workspace_id,project_id,client_id)
    REFERENCES clara_registry_projects(workspace_id,id,client_id),
  CHECK (resource_kind <> 'session' OR resource_id NOT LIKE 'external:%')
);
CREATE UNIQUE INDEX IF NOT EXISTS clara_native_one_active_binding
  ON clara_native_resource_authority(resource_kind,resource_id) WHERE revoked_at IS NULL;
-- Reviewed bindings reuse the existing verified identities, memberships and
-- delegated project/client management rights. There is no public binding API.
CREATE OR REPLACE FUNCTION clara_native_verify_reviewer() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clara_workspace_memberships member
    JOIN clara_registry_client_access ca ON ca.workspace_id=member.workspace_id
      AND ca.user_id=member.user_id AND ca.client_id=NEW.client_id AND ca.can_manage AND ca.revoked_at IS NULL
    JOIN clara_registry_project_access pa ON pa.workspace_id=member.workspace_id
      AND pa.user_id=member.user_id AND pa.project_id=NEW.project_id AND pa.can_manage AND pa.revoked_at IS NULL
    JOIN clara_registry_projects p ON p.workspace_id=member.workspace_id AND p.id=NEW.project_id
      AND p.client_id=NEW.client_id AND p.revoked_at IS NULL
    JOIN clara_registry_clients c ON c.workspace_id=member.workspace_id AND c.id=NEW.client_id AND c.revoked_at IS NULL
    WHERE member.user_id=NEW.reviewed_by AND member.workspace_id=NEW.workspace_id AND member.revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=member.user_id)
  ) OR NOT EXISTS (
    SELECT 1 FROM clara_workspace_memberships member
    JOIN clara_registry_client_access ca ON ca.workspace_id=member.workspace_id
      AND ca.user_id=member.user_id AND ca.client_id=NEW.client_id AND ca.can_read AND ca.revoked_at IS NULL
    JOIN clara_registry_project_access pa ON pa.workspace_id=member.workspace_id
      AND pa.user_id=member.user_id AND pa.project_id=NEW.project_id AND pa.can_read AND pa.revoked_at IS NULL
    WHERE member.user_id=NEW.owner_user_id AND member.workspace_id=NEW.workspace_id AND member.revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=member.user_id)
  ) THEN RAISE EXCEPTION 'NATIVE_ATTESTATION_REVIEW_DENIED' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clara_native_verify_reviewer ON clara_native_resource_authority;
CREATE TRIGGER clara_native_verify_reviewer BEFORE INSERT ON clara_native_resource_authority
  FOR EACH ROW EXECUTE FUNCTION clara_native_verify_reviewer();
CREATE OR REPLACE FUNCTION clara_native_preserve_attestation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'NATIVE_ATTESTATION_HISTORY_REQUIRED' USING ERRCODE='42501'; END IF;
  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL
    OR (to_jsonb(OLD)-'revoked_at') IS DISTINCT FROM (to_jsonb(NEW)-'revoked_at') THEN
    RAISE EXCEPTION 'NATIVE_ATTESTATION_IMMUTABLE' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clara_native_preserve_attestation ON clara_native_resource_authority;
CREATE TRIGGER clara_native_preserve_attestation BEFORE UPDATE OR DELETE ON clara_native_resource_authority
  FOR EACH ROW EXECUTE FUNCTION clara_native_preserve_attestation();
REVOKE ALL ON clara_native_resource_authority FROM PUBLIC;

-- One statement/snapshot: identity, resource owner, workspace membership, both
-- canonical ACLs and the exact reviewed data version are checked together.
CREATE OR REPLACE FUNCTION clara_native_read_session(
  session_digest TEXT, workspace TEXT, client TEXT, project TEXT, native_session TEXT
) RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER AS $$
 SELECT ns.data
 FROM clara_auth_sessions auth
 JOIN clara_workspace_memberships membership ON membership.user_id=auth.user_id
   AND membership.workspace_id=workspace AND membership.revoked_at IS NULL
 JOIN clara_registry_clients c ON c.workspace_id=workspace AND c.id=client AND c.revoked_at IS NULL
 JOIN clara_registry_projects p ON p.workspace_id=workspace AND p.id=project
   AND p.client_id=c.id AND p.revoked_at IS NULL
 JOIN clara_registry_client_access ca ON ca.workspace_id=workspace AND ca.client_id=c.id
   AND ca.user_id=auth.user_id AND ca.can_read AND ca.revoked_at IS NULL
 JOIN clara_registry_project_access pa ON pa.workspace_id=workspace AND pa.project_id=p.id
   AND pa.user_id=auth.user_id AND pa.can_read AND pa.revoked_at IS NULL
 JOIN clara_native_resource_authority binding ON binding.resource_kind='session'
   AND binding.resource_id=native_session AND binding.owner_user_id=auth.user_id
   AND binding.workspace_id=workspace AND binding.client_id=client AND binding.project_id=project
   AND binding.revoked_at IS NULL
 JOIN clara_sessions ns ON ns.id=binding.resource_id
   AND binding.snapshot_sha256=encode(sha256(convert_to(ns.data::text,'UTF8')),'hex')
 WHERE auth.token_hash=session_digest AND auth.revoked_at IS NULL AND auth.expires_at>statement_timestamp()
   AND workspace<>'default' AND native_session<>'default' AND native_session NOT LIKE 'external:%'
   AND EXISTS (SELECT 1 FROM clara_auth_identities identity WHERE identity.user_id=auth.user_id)
   AND COALESCE(ns.data#>>'{brainDashboard,context,event,context,productId}','')=''
   AND (ns.data->'mission' IS NULL OR ns.data->'mission'='null'::jsonb OR EXISTS (
     SELECT 1 FROM clara_missions m JOIN clara_native_resource_authority mb
       ON mb.resource_kind='mission' AND mb.resource_id=m.id
       AND mb.owner_user_id=auth.user_id AND mb.workspace_id=workspace
       AND mb.client_id=client AND mb.project_id=project AND mb.revoked_at IS NULL
       AND mb.snapshot_sha256=encode(sha256(convert_to(m.data::text,'UTF8')),'hex')
     WHERE m.id=ns.data#>>'{mission,id}' AND m.data=ns.data->'mission'
   ))
 LIMIT 1
$$;
REVOKE ALL ON FUNCTION clara_native_read_session(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
COMMIT;
