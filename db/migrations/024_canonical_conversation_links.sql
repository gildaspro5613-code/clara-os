-- Additive extension of the existing canonical registry. No backfill or startup DDL.
-- Requires 008,009,012 and native mission certification (013+). No voice grant.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_registry_conversation_links (
 id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
 owner_user_id TEXT NOT NULL REFERENCES clara_auth_users(id), client_id TEXT NOT NULL, project_id TEXT NOT NULL,
 native_session_id TEXT NOT NULL REFERENCES clara_sessions(id), auth_session_hash CHAR(64) NOT NULL,
 request_id TEXT NOT NULL, binding JSONB NOT NULL, proof JSONB,
 decision TEXT NOT NULL CHECK(decision IN ('pending','approved','revoking','revoked')),
 revision BIGINT NOT NULL DEFAULT 1, requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 request_expires_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 stop_receipt JSONB, UNIQUE(workspace_id,owner_user_id,request_id),
 FOREIGN KEY(workspace_id,project_id,client_id) REFERENCES clara_registry_projects(workspace_id,id,client_id)
);
CREATE OR REPLACE FUNCTION clara_registry_conversation_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,op TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE actor TEXT; ns JSONB; scope JSONB; link clara_registry_conversation_links%ROWTYPE; b JSONB; fresh JSONB; at_ TIMESTAMPTZ; changed BOOLEAN:=false;
BEGIN
 PERFORM 1 FROM clara_auth_workspaces WHERE id=w FOR UPDATE;
 ns:=clara_native_read_session(digest,w,c,p,s);
 SELECT user_id INTO actor FROM clara_auth_sessions WHERE token_hash=digest AND revoked_at IS NULL AND expires_at>clock_timestamp();
 IF ns IS NULL OR actor IS NULL OR ns#>>'{mission,id}' IS NULL
 OR ns->>'nativeMissionId' IS DISTINCT FROM ns#>>'{mission,id}' THEN
  RAISE EXCEPTION 'CONVERSATION_NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF op NOT IN ('read','revoke','stopConfirmed') AND NOT EXISTS(
  SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id
  WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor
  AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL
 ) THEN RAISE EXCEPTION 'CONVERSATION_APPROVAL_DENIED' USING ERRCODE='42501'; END IF;
 IF op='request' THEN
  IF payload->>'requestId' !~ '^[A-Za-z0-9_-]{16,80}$' OR COALESCE(length(payload->>'liveConversationId'),0) NOT BETWEEN 1 AND 160
  OR payload->>'liveConversationId' ~ '[[:cntrl:]/\\]' THEN RAISE EXCEPTION 'INVALID_CONVERSATION_REQUEST' USING ERRCODE='22023'; END IF;
  scope:=clara_registry_authority(digest,w,c,p,'read');
  SELECT * INTO link FROM clara_registry_conversation_links WHERE workspace_id=w AND owner_user_id=actor AND request_id=payload->>'requestId' FOR UPDATE;
  IF FOUND THEN
   IF link.client_id<>c OR link.project_id<>p OR link.native_session_id<>s
    OR link.binding->>'missionId' IS DISTINCT FROM ns#>>'{mission,id}'
    OR link.binding->>'liveConversationId' IS DISTINCT FROM payload->>'liveConversationId'
    OR link.binding->>'liveUserId' IS DISTINCT FROM scope->>'liveUserId'
    OR link.binding->>'liveProjectId' IS DISTINCT FROM scope->>'liveProjectId'
   THEN RAISE EXCEPTION 'CONVERSATION_REQUEST_CONFLICT' USING ERRCODE='23505'; END IF;
   RETURN to_jsonb(link)-'auth_session_hash';
  END IF;
  at_:=clock_timestamp();
  b:=jsonb_build_object('schemaVersion','clara.conversation-link.v1','capability','conversation:link','productId','clara-live',
   'associationId',payload->>'id','osUserId',actor,'workspaceId',w,'clientId',c,'projectId',p,
   'missionId',ns#>>'{mission,id}','nativeSessionId',s,'liveUserId',scope->>'liveUserId',
   'liveProjectId',scope->>'liveProjectId','liveConversationId',payload->>'liveConversationId',
   'identityProofId',scope->>'identityProofId','projectProofId',scope->>'projectProofId',
   'expiresAt',at_+interval '15 minutes');
  INSERT INTO clara_registry_conversation_links(id,workspace_id,owner_user_id,client_id,project_id,native_session_id,auth_session_hash,request_id,binding,decision,request_expires_at,expires_at)
  VALUES(payload->>'id',w,actor,c,p,s,digest,payload->>'requestId',b,'pending',at_+interval '5 minutes',at_+interval '15 minutes') RETURNING * INTO link;
  changed:=true;
 ELSE
  SELECT * INTO link FROM clara_registry_conversation_links WHERE id=payload->>'id' AND workspace_id=w AND owner_user_id=actor
   AND client_id=c AND project_id=p AND native_session_id=s FOR UPDATE;
  IF NOT FOUND OR link.binding->>'missionId' IS DISTINCT FROM ns#>>'{mission,id}' THEN RAISE EXCEPTION 'CONVERSATION_LINK_DENIED' USING ERRCODE='42501'; END IF;
  IF op IN ('approve','inspectProduct','authorizeProduct') THEN
   scope:=clara_registry_authority(digest,w,c,p,'read');
   fresh:=jsonb_build_object('osUserId',scope->>'osUserId','liveUserId',scope->>'liveUserId','liveProjectId',scope->>'liveProjectId','identityProofId',scope->>'identityProofId','projectProofId',scope->>'projectProofId');
   IF NOT link.binding @> fresh OR link.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'CONVERSATION_AUTHORITY_CHANGED' USING ERRCODE='42501'; END IF;
  END IF;
  IF op='approve' THEN
   IF link.decision='approved' AND link.proof=payload->'proof' AND (payload->>'expectedRevision')::bigint=link.revision-1 THEN RETURN to_jsonb(link)-'auth_session_hash'; END IF;
   IF link.decision<>'pending' OR link.request_expires_at<=clock_timestamp() OR link.revision IS DISTINCT FROM (payload->>'expectedRevision')::bigint
    OR payload#>>'{proof,schemaVersion}' IS DISTINCT FROM 'clara.conversation-link-proof.v1'
    OR payload#>'{proof,binding}' IS DISTINCT FROM link.binding OR payload#>>'{proof,decision}' IS DISTINCT FROM 'verified'
    OR COALESCE(payload#>>'{proof,proofId}','') !~ '^[a-f0-9]{64}$'
    OR COALESCE((payload#>>'{proof,expiresAt}')::timestamptz<=clock_timestamp(),true)
    OR (payload#>>'{proof,expiresAt}')::timestamptz>clock_timestamp()+interval '5 minutes'
   THEN RAISE EXCEPTION 'CONVERSATION_PROOF_DENIED' USING ERRCODE='42501'; END IF;
   UPDATE clara_registry_conversation_links SET decision='approved',proof=payload->'proof',revision=revision+1 WHERE id=link.id RETURNING * INTO link; changed:=true;
  ELSIF op='revoke' THEN
   IF link.decision NOT IN ('revoking','revoked') THEN
    IF link.revision IS DISTINCT FROM (payload->>'expectedRevision')::bigint THEN RAISE EXCEPTION 'CONVERSATION_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
    UPDATE clara_registry_conversation_links SET decision='revoking',revision=revision+1 WHERE id=link.id RETURNING * INTO link; changed:=true;
   END IF;
  ELSIF op='stopConfirmed' THEN
   IF link.decision='revoked' AND link.stop_receipt=payload->'receipt' THEN RETURN to_jsonb(link)-'auth_session_hash'; END IF;
   IF link.decision<>'revoking' OR payload#>'{receipt,binding}' IS DISTINCT FROM link.binding
    OR payload#>>'{receipt,schemaVersion}' IS DISTINCT FROM 'clara.conversation-link-stop.v1'
    OR payload#>>'{receipt,capability}' IS DISTINCT FROM 'conversation:link'
    OR payload#>>'{receipt,stopped}' IS DISTINCT FROM 'true'
    OR (payload#>>'{receipt,revision}')::bigint IS DISTINCT FROM link.revision THEN
    RAISE EXCEPTION 'CONVERSATION_STOP_UNCONFIRMED' USING ERRCODE='42501'; END IF;
   UPDATE clara_registry_conversation_links SET decision='revoked',stop_receipt=payload->'receipt' WHERE id=link.id RETURNING * INTO link; changed:=true;
  ELSIF op='inspectProduct' THEN
   IF link.decision<>'pending' OR link.request_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'CONVERSATION_REQUEST_UNAVAILABLE' USING ERRCODE='42501'; END IF;
  ELSIF op='authorizeProduct' THEN
   IF link.decision<>'approved' THEN RAISE EXCEPTION 'CONVERSATION_LINK_INACTIVE' USING ERRCODE='42501'; END IF;
  ELSIF op<>'read' THEN RAISE EXCEPTION 'INVALID_CONVERSATION_COMMAND' USING ERRCODE='22023'; END IF;
 END IF;
 IF changed THEN INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
 VALUES(w,actor,'conversation:'||op,link.id,jsonb_build_object('revision',link.revision,'decision',link.decision,'missionId',link.binding->>'missionId')); END IF;
 RETURN to_jsonb(link)-'auth_session_hash';
END $$;
CREATE OR REPLACE FUNCTION clara_registry_conversation_product(w TEXT,id_ TEXT,op TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE link clara_registry_conversation_links%ROWTYPE;
BEGIN
 IF op NOT IN ('inspectProduct','authorizeProduct','stopProduct') THEN RAISE EXCEPTION 'INVALID_CONVERSATION_COMMAND' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM clara_auth_workspaces WHERE id=w FOR UPDATE;
 SELECT * INTO link FROM clara_registry_conversation_links WHERE id=id_ AND workspace_id=w;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONVERSATION_LINK_DENIED' USING ERRCODE='42501'; END IF;
 IF op='stopProduct' THEN
  IF link.decision NOT IN ('revoking','revoked') THEN RAISE EXCEPTION 'CONVERSATION_STOP_NOT_REQUESTED' USING ERRCODE='42501'; END IF;
  RETURN to_jsonb(link)-'auth_session_hash';
 END IF;
 RETURN clara_registry_conversation_command(link.auth_session_hash,w,link.client_id,link.project_id,link.native_session_id,op,jsonb_build_object('id',id_));
END $$;
REVOKE ALL ON clara_registry_conversation_links FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_conversation_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_conversation_product(TEXT,TEXT,TEXT) FROM PUBLIC;
COMMIT;
