-- Additive authority over EXISTING connections and document attestations.
-- No historical attribution. Apply only after 014, with reviewed backup/grants.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_connections(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL,provider TEXT NOT NULL,status TEXT NOT NULL,scopes JSONB NOT NULL DEFAULT '[]',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS clara_connection_credentials(connection_id TEXT PRIMARY KEY REFERENCES clara_connections(id),encrypted_payload TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
-- Several explicitly owned Google accounts may coexist. Preserve every row.
ALTER TABLE clara_connections DROP CONSTRAINT IF EXISTS clara_connections_workspace_id_provider_key;
CREATE UNIQUE INDEX IF NOT EXISTS clara_connections_other_provider_unique ON clara_connections(workspace_id,provider) WHERE provider<>'google';
CREATE TABLE IF NOT EXISTS clara_native_google_authority(
 connection_id TEXT PRIMARY KEY REFERENCES clara_connections(id),owner_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
 issuer TEXT NOT NULL CHECK(issuer='https://accounts.google.com'),subject TEXT NOT NULL,revision BIGINT NOT NULL DEFAULT 1,revoked_at TIMESTAMPTZ
 -- Keep historical authority when a canonical Google identity is unlinked.
 -- Every operation revalidates issuer/subject/user against the live registry.
);
CREATE TABLE IF NOT EXISTS clara_native_google_delegations(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),connection_id TEXT NOT NULL REFERENCES clara_native_google_authority(connection_id),user_id TEXT NOT NULL REFERENCES clara_auth_users(id),workspace_id TEXT NOT NULL,client_id TEXT NOT NULL,project_id TEXT NOT NULL,granted_by TEXT NOT NULL REFERENCES clara_auth_users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),revoked_at TIMESTAMPTZ,
 FOREIGN KEY(workspace_id,project_id,client_id) REFERENCES clara_registry_projects(workspace_id,id,client_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS clara_native_google_active_delegation ON clara_native_google_delegations(connection_id,user_id,workspace_id,client_id,project_id) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS clara_native_google_oauth_transactions(
 state_hash TEXT PRIMARY KEY CHECK(state_hash~'^[a-f0-9]{64}$'),nonce_hash TEXT NOT NULL CHECK(nonce_hash~'^[a-f0-9]{64}$'),connection_id TEXT NOT NULL REFERENCES clara_native_google_authority(connection_id),actor_id TEXT NOT NULL REFERENCES clara_auth_users(id),session_digest TEXT NOT NULL,workspace_id TEXT NOT NULL,client_id TEXT NOT NULL,project_id TEXT NOT NULL,session_id TEXT NOT NULL,authority_revision BIGINT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,consumed_at TIMESTAMPTZ
);
ALTER TABLE clara_native_resource_authority ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION clara_native_preserve_google_authority() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.revoked_at IS NOT NULL OR NEW.revision<>OLD.revision+1
 OR (to_jsonb(OLD)-'revision'-'revoked_at') IS DISTINCT FROM (to_jsonb(NEW)-'revision'-'revoked_at') THEN
  RAISE EXCEPTION 'NATIVE_GOOGLE_AUTHORITY_IMMUTABLE' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clara_native_preserve_google_authority ON clara_native_google_authority;
CREATE TRIGGER clara_native_preserve_google_authority BEFORE UPDATE OR DELETE ON clara_native_google_authority FOR EACH ROW EXECUTE FUNCTION clara_native_preserve_google_authority();
DROP TRIGGER IF EXISTS clara_native_preserve_google_delegation ON clara_native_google_delegations;
CREATE TRIGGER clara_native_preserve_google_delegation BEFORE UPDATE OR DELETE ON clara_native_google_delegations FOR EACH ROW EXECUTE FUNCTION clara_native_preserve_attestation();
CREATE OR REPLACE FUNCTION clara_native_google_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE view JSONB; actor TEXT; conn TEXT; a clara_native_google_authority; co clara_connections; tx clara_native_google_oauth_transactions; subject_id TEXT; delegate_id TEXT; proof JSONB; b clara_native_resource_authority; ns JSONB;
BEGIN
 -- Existing runtime performs canonical checks and acquires workspace-first lock.
 view:=clara_native_runtime_command(digest,w,c,p,s,'read','{}');actor:=view->>'userId';conn:=payload->>'connectionId';
 IF operation='identity' THEN
  SELECT i.subject INTO subject_id FROM clara_auth_identities i WHERE i.user_id=actor AND i.issuer='https://accounts.google.com';
  IF subject_id IS NULL OR (SELECT COUNT(*) FROM clara_auth_identities i WHERE i.user_id=actor AND i.issuer='https://accounts.google.com')<>1 THEN RAISE EXCEPTION 'NATIVE_GOOGLE_IDENTITY_REQUIRED' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('userId',actor,'issuer','https://accounts.google.com','subject',subject_id);
 END IF;
 IF operation='list' THEN
  RETURN jsonb_build_object('connections',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ga.connection_id,'status',gc.status,'revision',ga.revision,'owned',ga.owner_user_id=actor)) FROM clara_native_google_authority ga JOIN clara_connections gc ON gc.id=ga.connection_id AND gc.workspace_id=w AND gc.provider='google' WHERE ga.workspace_id=w AND ga.revoked_at IS NULL AND (ga.owner_user_id=actor OR EXISTS(SELECT 1 FROM clara_native_google_delegations d WHERE d.connection_id=ga.connection_id AND d.user_id=actor AND d.workspace_id=w AND d.client_id=c AND d.project_id=p AND d.revoked_at IS NULL))),'[]'::jsonb));
 END IF;
 IF operation='begin' THEN
  IF view->>'canWrite'<>'true' OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=actor AND workspace_id=w AND role IN ('owner','admin') AND revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_MANAGE_DENIED' USING ERRCODE='42501'; END IF;
  subject_id:=(clara_native_google_command(digest,w,c,p,s,'identity','{}'))->>'subject';
  IF NOT EXISTS(SELECT 1 FROM clara_connections WHERE id=conn) THEN
   INSERT INTO clara_connections(id,workspace_id,provider,status,scopes) VALUES(conn,w,'google','PENDING_AUTHENTICATION','["openid","https://www.googleapis.com/auth/drive.readonly"]');
   INSERT INTO clara_native_google_authority(connection_id,owner_user_id,workspace_id,issuer,subject) VALUES(conn,actor,w,'https://accounts.google.com',subject_id);
  END IF;
 END IF;
 SELECT * INTO a FROM clara_native_google_authority WHERE connection_id=conn AND workspace_id=w AND revoked_at IS NULL FOR UPDATE;
 SELECT * INTO co FROM clara_connections WHERE id=conn AND workspace_id=w AND provider='google' FOR UPDATE;
 IF a.connection_id IS NULL OR co.id IS NULL OR NOT EXISTS(SELECT 1 FROM clara_auth_identities WHERE issuer=a.issuer AND subject=a.subject AND user_id=a.owner_user_id) OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=a.owner_user_id AND workspace_id=w AND revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.user_id=a.owner_user_id AND ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.can_read AND pa.can_read AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_OWNER_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF a.owner_user_id<>actor AND NOT EXISTS(SELECT 1 FROM clara_native_google_delegations WHERE connection_id=conn AND user_id=actor AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation IN ('begin','finish','callback','delegate','revoke','revokeDelegation') THEN
  IF a.owner_user_id<>actor OR view->>'canWrite'<>'true' OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=actor AND workspace_id=w AND role IN ('owner','admin') AND revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_MANAGE_DENIED' USING ERRCODE='42501'; END IF;
 END IF;
 IF operation='begin' THEN
  IF a.subject<>subject_id THEN RAISE EXCEPTION 'NATIVE_GOOGLE_IDENTITY_MISMATCH' USING ERRCODE='42501'; END IF;
  INSERT INTO clara_native_google_oauth_transactions(state_hash,nonce_hash,connection_id,actor_id,session_digest,workspace_id,client_id,project_id,session_id,authority_revision,expires_at)
  VALUES(payload->>'stateHash',payload->>'nonceHash',conn,actor,digest,w,c,p,s,a.revision,clock_timestamp()+INTERVAL '10 minutes');
  RETURN jsonb_build_object('connectionId',conn);
 ELSIF operation IN ('callback','finish') THEN
  SELECT * INTO tx FROM clara_native_google_oauth_transactions WHERE state_hash=payload->>'stateHash' FOR UPDATE;
  IF tx.state_hash IS NULL OR tx.nonce_hash IS DISTINCT FROM payload->>'nonceHash' OR tx.connection_id<>conn OR tx.actor_id<>actor OR tx.session_digest<>digest OR tx.workspace_id<>w OR tx.client_id<>c OR tx.project_id<>p OR tx.session_id<>s OR tx.authority_revision<>a.revision OR tx.consumed_at IS NOT NULL OR tx.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'NATIVE_GOOGLE_OAUTH_TRANSACTION_DENIED' USING ERRCODE='42501'; END IF;
  IF operation='finish' THEN
   IF payload->>'issuer' IS DISTINCT FROM a.issuer OR payload->>'subject' IS DISTINCT FROM a.subject OR length(payload->>'encryptedPayload') NOT BETWEEN 20 AND 65536 THEN RAISE EXCEPTION 'NATIVE_GOOGLE_IDENTITY_MISMATCH' USING ERRCODE='42501'; END IF;
   INSERT INTO clara_connection_credentials(connection_id,encrypted_payload) VALUES(conn,payload->>'encryptedPayload') ON CONFLICT(connection_id) DO UPDATE SET encrypted_payload=EXCLUDED.encrypted_payload,updated_at=clock_timestamp();
   UPDATE clara_connections SET status='ACTIVE',updated_at=clock_timestamp() WHERE id=conn;
   UPDATE clara_native_google_authority SET revision=revision+1 WHERE connection_id=conn;
   UPDATE clara_native_google_oauth_transactions SET consumed_at=clock_timestamp() WHERE state_hash=tx.state_hash;
  END IF;
 ELSIF operation='revoke' THEN
  UPDATE clara_native_google_authority SET revoked_at=clock_timestamp(),revision=revision+1 WHERE connection_id=conn;
  UPDATE clara_connections SET status='RECONNECT_REQUIRED',updated_at=clock_timestamp() WHERE id=conn;
 ELSIF operation='delegate' THEN
  delegate_id:=payload->>'userId';
  IF NOT EXISTS(SELECT 1 FROM clara_workspace_memberships mm JOIN clara_registry_client_access ca ON ca.user_id=mm.user_id AND ca.workspace_id=w AND ca.client_id=c AND ca.can_read AND ca.revoked_at IS NULL JOIN clara_registry_project_access pa ON pa.user_id=mm.user_id AND pa.workspace_id=w AND pa.project_id=p AND pa.can_read AND pa.revoked_at IS NULL WHERE mm.user_id=delegate_id AND mm.workspace_id=w AND mm.revoked_at IS NULL AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=mm.user_id)) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_DELEGATION_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO clara_native_google_delegations(connection_id,user_id,workspace_id,client_id,project_id,granted_by) VALUES(conn,delegate_id,w,c,p,actor) ON CONFLICT DO NOTHING;
  UPDATE clara_native_google_authority SET revision=revision+1 WHERE connection_id=conn;
 ELSIF operation='revokeDelegation' THEN
  UPDATE clara_native_google_delegations SET revoked_at=clock_timestamp() WHERE connection_id=conn AND user_id=payload->>'userId' AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL;
  UPDATE clara_native_google_authority SET revision=revision+1 WHERE connection_id=conn;
 ELSE
  IF co.status<>'ACTIVE' THEN RAISE EXCEPTION 'NATIVE_GOOGLE_REAUTH_REQUIRED' USING ERRCODE='42501'; END IF;
  IF operation='invalidate' THEN
   UPDATE clara_connections SET status='RECONNECT_REQUIRED',updated_at=clock_timestamp() WHERE id=conn;
   UPDATE clara_native_google_authority SET revision=revision+1 WHERE connection_id=conn;
  ELSIF operation='refresh' THEN
   IF (payload->>'revision')::bigint IS DISTINCT FROM a.revision THEN RAISE EXCEPTION 'NATIVE_GOOGLE_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
   UPDATE clara_connection_credentials SET encrypted_payload=payload->>'encryptedPayload',updated_at=clock_timestamp() WHERE connection_id=conn;
  ELSIF operation IN ('documents','document','inspect','bind','commit') THEN
   IF operation='documents' THEN
    RETURN jsonb_build_object('bindings',COALESCE((SELECT jsonb_agg(jsonb_build_object('bindingId',binding_id,'fileId',metadata->>'fileId','version',metadata->>'version')) FROM clara_native_resource_authority WHERE resource_kind='document' AND workspace_id=w AND client_id=c AND project_id=p AND owner_user_id=a.owner_user_id AND revoked_at IS NULL AND metadata->>'connectionId'=conn),'[]'::jsonb));
   END IF;
   IF operation IN ('inspect','bind') THEN
    IF actor<>a.owner_user_id OR view->>'canWrite'<>'true' OR length(payload->>'fileId') NOT BETWEEN 1 AND 400 THEN RAISE EXCEPTION 'NATIVE_DOCUMENT_BIND_DENIED' USING ERRCODE='42501'; END IF;
    -- A Google file has ONE canonical owner/workspace/client/project. Being a
    -- manager in another project is not permission to redeclare or steal it.
    IF EXISTS(SELECT 1 FROM clara_native_resource_authority known WHERE known.resource_kind='document' AND known.revoked_at IS NULL
      AND (known.metadata->>'fileId'=payload->>'fileId' OR known.resource_id=payload->>'fileId')
      AND (known.owner_user_id<>a.owner_user_id OR known.workspace_id<>w OR known.client_id<>c OR known.project_id<>p)) THEN
     RAISE EXCEPTION 'NATIVE_DOCUMENT_SCOPE_CONFLICT' USING ERRCODE='42501'; END IF;
    IF (payload->>'revision')::bigint IS DISTINCT FROM a.revision THEN RAISE EXCEPTION 'NATIVE_GOOGLE_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
    IF operation='inspect' THEN RETURN jsonb_build_object('reviewAllowed',true); END IF;
   END IF;
   IF operation='bind' THEN
    IF (payload->>'revision')::bigint IS DISTINCT FROM a.revision THEN RAISE EXCEPTION 'NATIVE_GOOGLE_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
    IF payload#>>'{metadata,connectionId}' IS DISTINCT FROM conn OR payload#>>'{metadata,fileId}' IS DISTINCT FROM payload->>'fileId' OR payload#>>'{metadata,version}' IS DISTINCT FROM payload->>'version' OR payload#>>'{metadata,issuer}' IS DISTINCT FROM a.issuer OR payload#>>'{metadata,subject}' IS DISTINCT FROM a.subject OR actor<>a.owner_user_id OR view->>'canWrite'<>'true' OR length(payload->>'fileId') NOT BETWEEN 1 AND 400 OR length(payload->>'version') NOT BETWEEN 1 AND 100 OR (view#>>'{session,mission,id}') IS NULL THEN RAISE EXCEPTION 'NATIVE_DOCUMENT_BIND_DENIED' USING ERRCODE='42501'; END IF;
    SELECT * INTO b FROM clara_native_resource_authority WHERE resource_kind='document' AND resource_id='google:'||encode(sha256(convert_to(payload->>'fileId','UTF8')),'hex') AND revoked_at IS NULL FOR UPDATE;
    IF b.binding_id IS NOT NULL AND (b.owner_user_id<>actor OR b.workspace_id<>w OR b.client_id<>c OR b.project_id<>p) THEN RAISE EXCEPTION 'NATIVE_DOCUMENT_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
    UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp()
     WHERE resource_kind='document' AND revoked_at IS NULL AND owner_user_id=a.owner_user_id AND workspace_id=w AND client_id=c AND project_id=p
      AND (metadata->>'fileId'=payload->>'fileId' OR resource_id=payload->>'fileId');
    INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason,metadata)
    VALUES('document','google:'||encode(sha256(convert_to(payload->>'fileId','UTF8')),'hex'),actor,w,c,p,encode(sha256(convert_to((payload->'metadata')::text,'UTF8')),'hex'),actor,'Explicit project document review with current Google principal and revision',payload->'metadata') RETURNING * INTO b;
    RETURN jsonb_build_object('bindingId',b.binding_id);
   END IF;
   SELECT * INTO b FROM clara_native_resource_authority WHERE resource_kind='document' AND binding_id=(payload->>'bindingId')::uuid AND owner_user_id=a.owner_user_id AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL AND metadata->>'connectionId'=conn FOR UPDATE;
   IF b.binding_id IS NULL OR b.snapshot_sha256<>encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') OR b.metadata->>'version' IS DISTINCT FROM payload->>'version' OR (payload->>'revision')::bigint IS DISTINCT FROM a.revision THEN RAISE EXCEPTION 'NATIVE_DOCUMENT_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
   IF operation='commit' THEN
    IF payload#>>'{commit,session,mission,id}' IS DISTINCT FROM view#>>'{session,mission,id}' THEN RAISE EXCEPTION 'NATIVE_DOCUMENT_MISSION_DENIED' USING ERRCODE='42501'; END IF;
    RETURN clara_native_runtime_command(digest,w,c,p,s,'commit',payload->'commit');
   END IF;
   RETURN jsonb_build_object('metadata',b.metadata,'bindingId',b.binding_id);
  ELSIF operation NOT IN ('authority','credentials') THEN RAISE EXCEPTION 'INVALID_NATIVE_GOOGLE_COMMAND' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN jsonb_build_object('userId',actor,'ownerUserId',a.owner_user_id,'connectionId',conn,'issuer',a.issuer,'subject',a.subject,'revision',a.revision,'connection',to_jsonb(co),'encryptedPayload',(SELECT encrypted_payload FROM clara_connection_credentials WHERE connection_id=conn));
END $$;
REVOKE ALL ON clara_native_google_authority,clara_native_google_delegations,clara_native_google_oauth_transactions,clara_connection_credentials FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_native_google_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
