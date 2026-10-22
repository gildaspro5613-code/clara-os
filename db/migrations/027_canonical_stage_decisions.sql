-- Additive capability; read/archive tickets are never mutation grants.
BEGIN;
ALTER TABLE clara_registry_project_access ADD COLUMN IF NOT EXISTS can_mutate_light BOOLEAN NOT NULL DEFAULT FALSE;
CREATE OR REPLACE FUNCTION clara_stage_acl_revocation() RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
 IF NOT NEW.can_read OR NOT NEW.can_manage OR NEW.revoked_at IS NOT NULL THEN NEW.can_mutate_light:=FALSE; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clara_stage_acl_revocation ON clara_registry_project_access;
CREATE TRIGGER clara_stage_acl_revocation BEFORE UPDATE ON clara_registry_project_access FOR EACH ROW EXECUTE FUNCTION clara_stage_acl_revocation();
REVOKE ALL ON FUNCTION clara_stage_acl_revocation() FROM PUBLIC;
CREATE TABLE IF NOT EXISTS clara_registry_stage_decisions (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
 session_hash TEXT NOT NULL, client_id TEXT NOT NULL, project_id TEXT NOT NULL,
 intent JSONB NOT NULL, nonce_hash CHAR(64) NOT NULL UNIQUE CHECK(nonce_hash ~ '^[a-f0-9]{64}$'),
 state TEXT NOT NULL CHECK(state IN ('approved','claimed','committed','revoked')),
 receipt JSONB, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION clara_registry_stage_command(digest TEXT,w TEXT,c TEXT,p TEXT,op TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE d clara_registry_stage_decisions%ROWTYPE; scope JSONB; actor TEXT; auth_digest TEXT; native_id TEXT; result JSONB;
BEGIN
 PERFORM 1 FROM clara_auth_workspaces WHERE id=w FOR UPDATE;
 IF op NOT IN ('list','grantLight','approve','claim','inspect','settle','revoke') THEN RAISE EXCEPTION 'INVALID_STAGE_OPERATION' USING ERRCODE='22023'; END IF;
 IF op='list' THEN
  scope:=clara_registry_authority(digest,w,c,p,'read');
  IF clara_native_read_session(digest,w,c,p,payload->>'nativeSessionId') IS NULL THEN RAISE EXCEPTION 'NATIVE_STAGE_SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('decisionId',id,'intentDigest',intent->>'intentDigest','state',state,'expiresAt',expires_at) ORDER BY created_at,id),'[]'::jsonb)
   INTO result FROM (SELECT * FROM clara_registry_stage_decisions WHERE workspace_id=w AND client_id=c AND project_id=p AND intent#>>'{scope,osUserId}'=scope->>'osUserId' AND state IN ('approved','claimed') ORDER BY created_at,id LIMIT 100) pending;
  RETURN jsonb_build_object('decisions',result,'batchLimit',100);
 ELSIF op='grantLight' THEN
  scope:=clara_registry_authority(digest,w,c,p,'read'); actor:=scope->>'osUserId';
  IF NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE workspace_id=w AND user_id=actor AND role IN ('owner','admin') AND revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_registry_project_access WHERE workspace_id=w AND project_id=p AND user_id=actor AND can_manage AND revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_registry_client_access WHERE workspace_id=w AND client_id=c AND user_id=actor AND can_manage AND revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships m JOIN clara_auth_identities i ON i.user_id=m.user_id WHERE m.workspace_id=w AND m.user_id=payload->>'userId' AND m.revoked_at IS NULL)
    OR jsonb_typeof(payload->'enabled') IS DISTINCT FROM 'boolean' THEN
   RAISE EXCEPTION 'STAGE_MANAGE_REQUIRED' USING ERRCODE='42501'; END IF;
  IF payload->>'enabled'='false' AND EXISTS(SELECT 1 FROM clara_registry_stage_decisions WHERE workspace_id=w AND project_id=p AND intent#>>'{scope,osUserId}'=payload->>'userId' AND state IN ('approved','claimed')) THEN
   RAISE EXCEPTION 'STAGE_CANCELLATION_REQUIRED' USING ERRCODE='40001'; END IF;
  UPDATE clara_registry_project_access SET can_mutate_light=(payload->>'enabled')::boolean
   WHERE workspace_id=w AND project_id=p AND user_id=payload->>'userId' AND can_read AND can_manage AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAGE_TARGET_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
   VALUES(w,actor,'stage.grantLight',p,payload);
  RETURN jsonb_build_object('userId',payload->>'userId','enabled',payload->'enabled');
 ELSIF op='approve' THEN
  scope:=clara_registry_authority(digest,w,c,p,'read');
  actor:=scope->>'osUserId';
  IF clara_native_read_session(digest,w,c,p,payload#>>'{intent,scope,nativeSessionId}') IS NULL THEN RAISE EXCEPTION 'NATIVE_STAGE_SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clara_registry_client_access WHERE workspace_id=w AND client_id=c AND user_id=actor AND can_manage AND revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_registry_project_access WHERE workspace_id=w AND project_id=p AND user_id=actor AND can_manage AND can_mutate_light AND revoked_at IS NULL) THEN
   RAISE EXCEPTION 'STAGE_MANAGE_REQUIRED' USING ERRCODE='42501'; END IF;
  IF payload#>>'{intent,scope,workspaceId}' IS DISTINCT FROM w OR payload#>>'{intent,scope,osUserId}' IS DISTINCT FROM actor
   OR payload#>>'{intent,scope,projectId}' IS DISTINCT FROM p OR payload#>>'{intent,scope,clientId}' IS DISTINCT FROM c
   OR payload#>>'{intent,scope,liveUserId}' IS DISTINCT FROM scope->>'liveUserId'
   OR payload#>>'{intent,scope,liveProjectId}' IS DISTINCT FROM scope->>'liveProjectId'
   OR payload#>>'{intent,schemaVersion}' IS DISTINCT FROM 'clara.stage-intent.v1'
   OR payload#>>'{intent,capability}' IS DISTINCT FROM 'stage:light:mutate:v1'
   OR COALESCE(payload#>>'{intent,intentDigest}','') !~ '^[a-f0-9]{64}$' OR COALESCE(payload->>'nonceHash','') !~ '^[a-f0-9]{64}$' THEN
   RAISE EXCEPTION 'STAGE_SCOPE_MISMATCH' USING ERRCODE='42501'; END IF;
  INSERT INTO clara_registry_stage_decisions(id,workspace_id,session_hash,client_id,project_id,intent,nonce_hash,state,expires_at)
   VALUES(payload->>'id',w,digest,c,p,payload->'intent',payload->>'nonceHash','approved',NOW()+INTERVAL '45 seconds');
 ELSE
  SELECT * INTO d FROM clara_registry_stage_decisions WHERE id=payload->>'id' AND workspace_id=w FOR UPDATE;
  IF NOT FOUND OR ((digest='' OR payload->>'nonceHash' IS NOT NULL) AND d.nonce_hash IS DISTINCT FROM payload->>'nonceHash') THEN RAISE EXCEPTION 'STAGE_DECISION_DENIED' USING ERRCODE='42501'; END IF;
  -- Products must redeem the issuing session. A freshly authenticated SAME owner
  -- may only inspect/cancel/settle an old operation, never renew its claim.
  IF digest<>'' AND (c IS DISTINCT FROM d.client_id OR p IS DISTINCT FROM d.project_id OR op='claim') THEN RAISE EXCEPTION 'STAGE_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
  auth_digest:=CASE WHEN digest='' THEN d.session_hash ELSE digest END;
  native_id:=CASE WHEN digest='' THEN d.intent#>>'{scope,nativeSessionId}' ELSE COALESCE(payload->>'nativeSessionId',d.intent#>>'{scope,nativeSessionId}') END;
  scope:=clara_registry_authority(auth_digest,w,d.client_id,d.project_id,'read');
  actor:=scope->>'osUserId';
  IF actor IS DISTINCT FROM d.intent#>>'{scope,osUserId}' OR clara_native_read_session(auth_digest,w,d.client_id,d.project_id,native_id) IS NULL THEN RAISE EXCEPTION 'NATIVE_STAGE_SESSION_REQUIRED' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM clara_registry_project_access WHERE workspace_id=w AND project_id=d.project_id AND user_id=actor AND can_manage AND can_mutate_light AND revoked_at IS NULL)
   OR NOT EXISTS(SELECT 1 FROM clara_registry_client_access WHERE workspace_id=w AND client_id=d.client_id AND user_id=actor AND can_manage AND revoked_at IS NULL)
   OR d.intent#>>'{scope,liveUserId}' IS DISTINCT FROM scope->>'liveUserId' OR d.intent#>>'{scope,liveProjectId}' IS DISTINCT FROM scope->>'liveProjectId' THEN
   RAISE EXCEPTION 'STAGE_AUTHORITY_REVOKED' USING ERRCODE='42501'; END IF;
  IF op='settle' THEN
   IF d.state NOT IN ('claimed','committed') OR d.intent->>'intentDigest' IS DISTINCT FROM payload->>'intentDigest'
    OR payload#>>'{receipt,decisionId}' IS DISTINCT FROM d.id
    OR payload#>>'{receipt,modelDigest}' IS DISTINCT FROM d.intent->>'modelDigest'
    OR payload#>>'{receipt,revision}' IS DISTINCT FROM encode(sha256(convert_to('clara.stage-revision.v1'||E'\n'||d.id||E'\n'||COALESCE(d.intent->>'expectedRevision','none')||E'\n'||(d.intent->>'modelDigest'),'UTF8')),'hex')
    OR payload#>'{receipt,parent}' IS DISTINCT FROM d.intent->'expectedRevision'
    OR payload#>>'{receipt,modelId}' IS DISTINCT FROM d.intent->>'modelId'
    OR payload#>>'{receipt,preparationId}' IS DISTINCT FROM d.intent->>'preparationId'
    OR payload#>>'{receipt,runId}' IS DISTINCT FROM d.intent->>'runId'
    OR payload#>>'{receipt,schemaVersion}' IS DISTINCT FROM 'clara.stage-receipt.v1'
    OR (d.receipt IS NOT NULL AND d.receipt IS DISTINCT FROM payload->'receipt') THEN
    RAISE EXCEPTION 'STAGE_RECEIPT_MISMATCH' USING ERRCODE='42501'; END IF;
   UPDATE clara_registry_stage_decisions SET state='committed',receipt=payload->'receipt' WHERE id=d.id;
  ELSIF op='revoke' THEN
   IF d.state='committed' OR digest='' OR payload->>'liveCancellation' IS DISTINCT FROM 'cancelled' THEN RAISE EXCEPTION 'STAGE_CANCELLATION_REQUIRED' USING ERRCODE='42501'; END IF;
   UPDATE clara_registry_stage_decisions SET state='revoked' WHERE id=d.id;
  ELSE
   IF (op='claim' AND (d.state IN ('revoked','committed') OR d.expires_at<=NOW())) OR ((digest='' OR payload->>'intentDigest' IS NOT NULL) AND d.intent->>'intentDigest' IS DISTINCT FROM payload->>'intentDigest') THEN
    RAISE EXCEPTION 'STAGE_DECISION_EXPIRED_OR_CHANGED' USING ERRCODE='42501'; END IF;
   IF op='claim' THEN UPDATE clara_registry_stage_decisions SET state='claimed' WHERE id=d.id; END IF;
  END IF;
 END IF;
 SELECT * INTO d FROM clara_registry_stage_decisions WHERE id=payload->>'id';
 INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
 VALUES(w,actor,'stage.'||op,d.id,jsonb_build_object('intentDigest',d.intent->>'intentDigest','state',d.state));
 RETURN jsonb_build_object('schemaVersion','clara.stage-decision.v1','decisionId',d.id,'state',d.state,'intent',d.intent,'expiresAt',d.expires_at,'receipt',d.receipt);
END $$;
REVOKE ALL ON clara_registry_stage_decisions FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_stage_command(TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
