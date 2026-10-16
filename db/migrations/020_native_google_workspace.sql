-- Additive extension of canonical Google authority and existing operation ledger.
-- No provider I/O, ownership inference, historical reassignment or Production startup DDL.
BEGIN;
ALTER TABLE clara_native_google_oauth_transactions ADD COLUMN IF NOT EXISTS requested_scopes JSONB NOT NULL DEFAULT '["openid","https://www.googleapis.com/auth/drive.readonly"]';
ALTER TABLE clara_native_resource_authority DROP CONSTRAINT IF EXISTS clara_native_resource_authority_resource_kind_check;
ALTER TABLE clara_native_resource_authority ADD CONSTRAINT clara_native_resource_authority_resource_kind_check CHECK(resource_kind IN ('session','mission','document','acquisition','calendar'));
ALTER TABLE clara_external_event_jobs DROP CONSTRAINT IF EXISTS clara_external_event_jobs_job_kind_check;
ALTER TABLE clara_external_event_jobs ADD CONSTRAINT clara_external_event_jobs_job_kind_check CHECK(job_kind IN ('external-event','native-chat','native-google'));
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
  RETURN jsonb_build_object('connections',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ga.connection_id,'status',gc.status,'scopes',gc.scopes,'revision',ga.revision,'owned',ga.owner_user_id=actor)) FROM clara_native_google_authority ga JOIN clara_connections gc ON gc.id=ga.connection_id AND gc.workspace_id=w AND gc.provider='google' WHERE ga.workspace_id=w AND ga.revoked_at IS NULL AND (ga.owner_user_id=actor OR EXISTS(SELECT 1 FROM clara_native_google_delegations d WHERE d.connection_id=ga.connection_id AND d.user_id=actor AND d.workspace_id=w AND d.client_id=c AND d.project_id=p AND d.revoked_at IS NULL))),'[]'::jsonb));
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
  IF payload ? 'requestedScopes' AND (jsonb_typeof(payload->'requestedScopes')<>'array' OR NOT (payload->'requestedScopes' @> '["openid"]'::jsonb) OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(payload->'requestedScopes') x WHERE x NOT IN ('openid','https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/calendar.calendarlist.readonly','https://www.googleapis.com/auth/calendar.events'))) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_SCOPES_DENIED' USING ERRCODE='42501'; END IF;
  INSERT INTO clara_native_google_oauth_transactions(state_hash,nonce_hash,connection_id,actor_id,session_digest,workspace_id,client_id,project_id,session_id,authority_revision,expires_at,requested_scopes)
  VALUES(payload->>'stateHash',payload->>'nonceHash',conn,actor,digest,w,c,p,s,a.revision,clock_timestamp()+INTERVAL '10 minutes',COALESCE(payload->'requestedScopes','["openid","https://www.googleapis.com/auth/drive.readonly"]'::jsonb));
  RETURN jsonb_build_object('connectionId',conn);
 ELSIF operation IN ('callback','finish') THEN
  SELECT * INTO tx FROM clara_native_google_oauth_transactions WHERE state_hash=payload->>'stateHash' FOR UPDATE;
  IF tx.state_hash IS NULL OR tx.nonce_hash IS DISTINCT FROM payload->>'nonceHash' OR tx.connection_id<>conn OR tx.actor_id<>actor OR tx.session_digest<>digest OR tx.workspace_id<>w OR tx.client_id<>c OR tx.project_id<>p OR tx.session_id<>s OR tx.authority_revision<>a.revision OR tx.consumed_at IS NOT NULL OR tx.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'NATIVE_GOOGLE_OAUTH_TRANSACTION_DENIED' USING ERRCODE='42501'; END IF;
  IF operation='finish' THEN
   IF payload->>'issuer' IS DISTINCT FROM a.issuer OR payload->>'subject' IS DISTINCT FROM a.subject OR length(payload->>'encryptedPayload') NOT BETWEEN 20 AND 65536 THEN RAISE EXCEPTION 'NATIVE_GOOGLE_IDENTITY_MISMATCH' USING ERRCODE='42501'; END IF;
   IF payload ? 'grantedScopes' AND (jsonb_typeof(payload->'grantedScopes')<>'array' OR NOT (payload->'grantedScopes' @> tx.requested_scopes)) THEN RAISE EXCEPTION 'NATIVE_GOOGLE_CONSENT_INCOMPLETE' USING ERRCODE='42501'; END IF;
   IF NOT payload ? 'grantedScopes' AND tx.requested_scopes<>'["openid","https://www.googleapis.com/auth/drive.readonly"]'::jsonb THEN RAISE EXCEPTION 'NATIVE_GOOGLE_CONSENT_INCOMPLETE' USING ERRCODE='42501'; END IF;
   INSERT INTO clara_connection_credentials(connection_id,encrypted_payload) VALUES(conn,payload->>'encryptedPayload') ON CONFLICT(connection_id) DO UPDATE SET encrypted_payload=EXCLUDED.encrypted_payload,updated_at=clock_timestamp();
   UPDATE clara_connections SET status='ACTIVE',scopes=COALESCE(payload->'grantedScopes',tx.requested_scopes),updated_at=clock_timestamp() WHERE id=conn;
   UPDATE clara_native_google_authority SET revision=revision+1 WHERE connection_id=conn;
   UPDATE clara_native_google_oauth_transactions SET consumed_at=clock_timestamp() WHERE state_hash=tx.state_hash;
  END IF;
 ELSIF operation='historyAuthority' THEN RETURN jsonb_build_object('userId',actor,'ownerUserId',a.owner_user_id,'connectionId',conn,'issuer',a.issuer,'subject',a.subject,'revision',a.revision,'connection',to_jsonb(co));
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
   IF payload ? 'grantedScopes' AND payload->'grantedScopes' IS DISTINCT FROM co.scopes THEN
    UPDATE clara_connections SET scopes=payload->'grantedScopes',updated_at=clock_timestamp() WHERE id=conn;
    UPDATE clara_native_google_authority SET revision=revision+1 WHERE connection_id=conn;
   END IF;
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
 RETURN jsonb_build_object('userId',actor,'ownerUserId',a.owner_user_id,'connectionId',conn,'issuer',a.issuer,'subject',a.subject,'revision',a.revision,'connection',to_jsonb(co),'requestedScopes',tx.requested_scopes,'encryptedPayload',(SELECT encrypted_payload FROM clara_connection_credentials WHERE connection_id=conn));
END $$;
CREATE OR REPLACE FUNCTION clara_native_google_work_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE view_ JSONB; auth_ JSONB; actor TEXT; conn TEXT:=payload->>'connectionId'; mid TEXT; b clara_native_resource_authority; resource JSONB; kind_ TEXT; rid TEXT; metadata_ JSONB; jid TEXT; job clara_external_event_jobs; fp TEXT; result_ JSONB; own BOOLEAN; grants_ JSONB; entry_ JSONB;
BEGIN
 view_:=clara_native_runtime_command(digest,w,c,p,s,'read','{}');actor:=view_->>'userId';mid:=view_#>>'{session,mission,id}';
 auth_:=clara_native_google_command(digest,w,c,p,s,CASE WHEN operation IN ('capabilities','list','lookup') THEN 'historyAuthority' ELSE 'authority' END,jsonb_build_object('connectionId',conn));own:=auth_->>'ownerUserId'=actor;grants_:=auth_#>'{connection,scopes}';
 IF operation='capabilities' THEN RETURN jsonb_build_object('owned',own,'missionId',mid,'canManage',view_->'canWrite','canConsent',view_->>'canWrite'='true' AND EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=actor AND workspace_id=w AND role IN ('owner','admin') AND revoked_at IS NULL),'calendar',auth_#>>'{connection,status}'='ACTIVE' AND grants_ @> '["https://www.googleapis.com/auth/calendar.calendarlist.readonly","https://www.googleapis.com/auth/calendar.events"]'::jsonb,'drive',auth_#>>'{connection,status}'='ACTIVE' AND (grants_ ? 'https://www.googleapis.com/auth/drive.file' OR grants_ ? 'https://www.googleapis.com/auth/drive'),'fullDrive',grants_ ? 'https://www.googleapis.com/auth/drive','revision',auth_->'revision'); END IF;
 IF operation='candidate' THEN
  kind_:=CASE WHEN payload->>'kind'='calendar' THEN 'calendar' ELSE 'document' END;
  rid:=CASE WHEN kind_='calendar' THEN 'google-calendar:' ELSE 'google:' END||encode(sha256(convert_to(payload->>'id','UTF8')),'hex');
  RETURN jsonb_build_object('allowed',NOT EXISTS(SELECT 1 FROM clara_native_resource_authority WHERE resource_kind=kind_ AND resource_id=rid AND revoked_at IS NULL AND (owner_user_id<>auth_->>'ownerUserId' OR workspace_id<>w OR client_id<>c OR project_id<>p)));
 END IF;
 IF operation='resources' THEN
  RETURN jsonb_build_object('resources',COALESCE((SELECT jsonb_agg(jsonb_build_object('bindingId',binding_id,'resourceId',resource_id,'kind',resource_kind,'metadata',metadata)) FROM clara_native_resource_authority WHERE workspace_id=w AND client_id=c AND project_id=p AND owner_user_id=auth_->>'ownerUserId' AND revoked_at IS NULL AND resource_kind IN ('document','calendar') AND metadata->>'connectionId'=conn AND snapshot_sha256=encode(sha256(convert_to(metadata::text,'UTF8')),'hex')),'[]'::jsonb));
 END IF;
 IF operation='resource' THEN
  SELECT * INTO b FROM clara_native_resource_authority WHERE binding_id=(payload->>'bindingId')::uuid AND workspace_id=w AND client_id=c AND project_id=p AND owner_user_id=auth_->>'ownerUserId' AND revoked_at IS NULL AND metadata->>'connectionId'=conn;
  IF b.binding_id IS NULL OR b.snapshot_sha256<>encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'GOOGLE_RESOURCE_DENIED' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('bindingId',b.binding_id,'metadata',b.metadata,'resourceId',b.resource_id,'kind',b.resource_kind);
 END IF;
 IF operation IN ('prepare','bind','claim','finish','uncertain','cancel','refuse') AND (NOT own OR mid IS NULL OR view_->>'canWrite'<>'true') THEN RAISE EXCEPTION 'GOOGLE_WORK_WRITE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='bind' THEN
  metadata_:=payload->'metadata';kind_:=CASE WHEN metadata_->>'kind'='calendar' THEN 'calendar' ELSE 'document' END;
  rid:=CASE WHEN kind_='calendar' THEN 'google-calendar:' ELSE 'google:' END||encode(sha256(convert_to(metadata_->>'id','UTF8')),'hex');
  IF metadata_->>'kind' NOT IN ('calendar','folder') OR metadata_->>'id' IS NULL OR metadata_->>'connectionId' IS DISTINCT FROM conn OR metadata_->>'issuer' IS DISTINCT FROM auth_->>'issuer' OR metadata_->>'subject' IS DISTINCT FROM auth_->>'subject' OR metadata_->>'version' IS NULL THEN RAISE EXCEPTION 'GOOGLE_RESOURCE_DENIED' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM clara_native_resource_authority WHERE resource_kind=kind_ AND resource_id=rid AND revoked_at IS NULL AND (owner_user_id<>actor OR workspace_id<>w OR client_id<>c OR project_id<>p)) THEN RAISE EXCEPTION 'GOOGLE_RESOURCE_SCOPE_CONFLICT' USING ERRCODE='42501'; END IF;
  UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind=kind_ AND resource_id=rid AND revoked_at IS NULL;
  INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason,metadata) VALUES(kind_,rid,actor,w,c,p,encode(sha256(convert_to(metadata_::text,'UTF8')),'hex'),actor,'Explicit native Google resource review, live principal and provider permission',metadata_);
  PERFORM clara_native_runtime_command(digest,w,c,p,s,'commit',payload->'commit');RETURN '{}'::jsonb;
 END IF;
 IF operation='list' THEN
  RETURN jsonb_build_object('operations',COALESCE((SELECT jsonb_agg(jsonb_build_object('operationId',request->>'operationId','status',CASE WHEN status='queued' AND expires_at<=clock_timestamp() THEN 'expired' ELSE status END,'phase',phase,'kind',request->>'kind','createdAt',created_at) ORDER BY created_at DESC) FROM clara_external_event_jobs WHERE job_kind='native-google' AND request->>'actor'=actor AND os_workspace_id=w AND request->>'clientId'=c AND request->>'projectId'=p AND request->>'missionId'=mid AND request->>'connectionId'=conn),'[]'::jsonb));
 END IF;
 IF payload->>'operationId' !~ '^[A-Za-z0-9_-]{16,80}$' OR payload->>'operationId' IS NULL THEN RAISE EXCEPTION 'GOOGLE_OPERATION_REQUIRED' USING ERRCODE='22023'; END IF;
 jid:=encode(sha256(convert_to(jsonb_build_array('native-google',actor,payload->>'operationId')::text,'UTF8')),'hex');
 SELECT * INTO job FROM clara_external_event_jobs WHERE job_id=jid FOR UPDATE;
 IF job.job_id IS NOT NULL AND (job.job_kind<>'native-google' OR job.os_workspace_id<>w OR job.request->>'actor'<>actor OR job.request->>'clientId'<>c OR job.request->>'projectId'<>p OR job.request->>'missionId' IS DISTINCT FROM mid OR job.request->>'connectionId'<>conn) THEN RAISE EXCEPTION 'GOOGLE_OPERATION_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='lookup' THEN
  IF job.job_id IS NULL THEN RETURN '{}'::jsonb; END IF;
  RETURN jsonb_build_object('jobId',job.job_id,'status',job.status,'request',job.request,'result',job.result,'expired',job.expires_at<=clock_timestamp(),'ownerToken',job.owner_token);
 END IF;
 IF operation='prepare' THEN
  fp:=encode(sha256(convert_to(jsonb_build_array(actor,w,c,p,mid,conn,payload->>'inputHash')::text,'UTF8')),'hex');
  IF job.job_id IS NOT NULL THEN
   IF job.fingerprint<>fp THEN RAISE EXCEPTION 'GOOGLE_OPERATION_CONTENT_CONFLICT' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('operationId',payload->>'operationId','status',job.status);
  END IF;
  IF payload->>'missionId' IS DISTINCT FROM mid OR payload->>'authorityRevision' IS DISTINCT FROM auth_->>'revision' THEN RAISE EXCEPTION 'GOOGLE_CONTEXT_CHANGED' USING ERRCODE='40001'; END IF;
  kind_:=payload->>'kind';
  IF kind_ NOT IN ('calendar.create','calendar.update','drive.upload','drive.create','drive.update','drive.move') OR COALESCE(length(payload->>'encryptedPlan'),0) NOT BETWEEN 20 AND 4000000 OR jsonb_array_length(payload->'resources') NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'GOOGLE_OPERATION_INVALID' USING ERRCODE='22023'; END IF;
  job.request:=jsonb_build_object('actor',actor,'clientId',c,'projectId',p,'missionId',mid,'connectionId',conn,'operationId',payload->>'operationId','targetId',payload->>'targetId','kind',kind_,'authorityRevision',auth_->'revision','inputHash',payload->>'inputHash','planHash',payload->>'planHash','encryptedPlan',payload->>'encryptedPlan','resources',payload->'resources');
 ELSE
  IF job.job_id IS NULL THEN RAISE EXCEPTION 'GOOGLE_OPERATION_DENIED' USING ERRCODE='42501'; END IF;
  kind_:=job.request->>'kind';
 END IF;
 IF operation='claim' AND job.status<>'queued' THEN RETURN jsonb_build_object('owned',false,'status',job.status); END IF;
 IF operation IN ('claim','prepare','attempt','finish') THEN
  IF kind_ LIKE 'calendar.%' AND NOT (grants_ @> '["https://www.googleapis.com/auth/calendar.calendarlist.readonly","https://www.googleapis.com/auth/calendar.events"]'::jsonb)
   OR kind_ LIKE 'drive.%' AND NOT (grants_ ? 'https://www.googleapis.com/auth/drive.file' OR grants_ ? 'https://www.googleapis.com/auth/drive') THEN RAISE EXCEPTION 'GOOGLE_CONSENT_REQUIRED' USING ERRCODE='42501'; END IF;
  IF job.request->>'authorityRevision' IS DISTINCT FROM auth_->>'revision' AND NOT (operation='finish' AND payload->>'reconcile'='true') THEN RAISE EXCEPTION 'GOOGLE_AUTHORITY_CHANGED' USING ERRCODE='40001'; END IF;
  FOR resource IN SELECT value FROM jsonb_array_elements(job.request->'resources') LOOP
   SELECT * INTO b FROM clara_native_resource_authority WHERE binding_id=(resource->>'bindingId')::uuid AND owner_user_id=auth_->>'ownerUserId' AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL AND metadata->>'connectionId'=conn FOR UPDATE;
   IF b.binding_id IS NULL OR b.snapshot_sha256<>encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') THEN RAISE EXCEPTION 'GOOGLE_RESOURCE_REVOKED' USING ERRCODE='42501'; END IF;
  END LOOP;
 END IF;
 IF operation='prepare' THEN
  INSERT INTO clara_external_event_jobs(job_id,scope_key,product_id,os_workspace_id,fingerprint,request,status,phase,correlation_id,expires_at,job_kind)
   VALUES(jid,'native-google:'||encode(sha256(convert_to(jsonb_build_array(w,mid,conn)::text,'UTF8')),'hex'),'clara-os',w,fp,job.request,'queued','confirmation-required',replace(gen_random_uuid()::text,'-',''),clock_timestamp()+INTERVAL '15 minutes','native-google');
 ELSIF operation='claim' THEN
  IF job.status<>'queued' THEN RETURN jsonb_build_object('owned',false,'status',job.status); END IF;
  IF job.expires_at<=clock_timestamp() OR payload->>'confirm' IS DISTINCT FROM 'true' OR payload->>'planHash' IS DISTINCT FROM job.request->>'planHash' THEN RAISE EXCEPTION 'GOOGLE_CONFIRMATION_REQUIRED' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM clara_external_event_jobs WHERE scope_key=job.scope_key AND status IN ('processing','uncertain')) THEN RAISE EXCEPTION 'GOOGLE_RECONCILIATION_REQUIRED' USING ERRCODE='40001'; END IF;
  INSERT INTO clara_tool_approvals(id,token_hash,call_id,capability_id,arguments,actor_id,workspace_id,status,expires_at) VALUES(jid,encode(sha256(convert_to(jid||(job.request->>'planHash'),'UTF8')),'hex'),jid,CASE WHEN kind_ LIKE 'calendar.%' THEN 'google.calendar.write' ELSE 'google.drive.write' END,job.request->>'planHash',actor,w,'PROCESSING',clock_timestamp()+INTERVAL '15 minutes');
  UPDATE clara_external_event_jobs SET status='processing',phase='handoff',owner_token=(payload->>'ownerToken')::uuid,started_at=clock_timestamp(),updated_at=clock_timestamp() WHERE job_id=jid;
 ELSIF operation='attempt' THEN
  IF NOT own OR view_->>'canWrite'<>'true' OR job.status<>'processing' OR job.owner_token IS DISTINCT FROM (payload->>'ownerToken')::uuid THEN RAISE EXCEPTION 'GOOGLE_ATTEMPT_DENIED' USING ERRCODE='42501'; END IF;
  RETURN '{}'::jsonb;
 ELSIF operation='refuse' THEN
  IF job.status<>'processing' OR job.owner_token IS DISTINCT FROM (payload->>'ownerToken')::uuid THEN RAISE EXCEPTION 'GOOGLE_ATTEMPT_DENIED' USING ERRCODE='42501'; END IF;
  UPDATE clara_external_event_jobs SET status='failed',phase='refused',failure_code='GOOGLE_PROVIDER_REFUSED',updated_at=clock_timestamp() WHERE job_id=jid;
  UPDATE clara_tool_approvals SET status='FAILED',completed_at=clock_timestamp() WHERE id=jid AND status='PROCESSING';
 ELSIF operation='uncertain' THEN
  IF job.status IN ('processing','uncertain') AND job.owner_token=(payload->>'ownerToken')::uuid THEN UPDATE clara_external_event_jobs SET status='uncertain',phase='uncertain-no-retry',updated_at=clock_timestamp() WHERE job_id=jid; END IF;
 ELSIF operation='cancel' THEN
  IF job.status<>'queued' THEN RAISE EXCEPTION 'GOOGLE_CANNOT_CANCEL_HANDOFF' USING ERRCODE='42501'; END IF;
  UPDATE clara_external_event_jobs SET status='failed',phase='cancelled',failure_code='HUMAN_CANCELLED',updated_at=clock_timestamp() WHERE job_id=jid;
 ELSIF operation='finish' THEN
  IF job.status='completed' THEN RETURN job.result; END IF;
  IF job.status NOT IN ('processing','uncertain') OR job.owner_token IS DISTINCT FROM (payload->>'ownerToken')::uuid THEN RAISE EXCEPTION 'GOOGLE_ATTEMPT_DENIED' USING ERRCODE='42501'; END IF;
  metadata_:=payload->'fileMetadata';
  IF metadata_ IS NOT NULL AND metadata_<>'null'::jsonb THEN
   IF metadata_->>'connectionId' IS DISTINCT FROM conn OR metadata_->>'subject' IS DISTINCT FROM auth_->>'subject' OR metadata_->>'issuer' IS DISTINCT FROM auth_->>'issuer' OR metadata_->>'version' IS NULL OR metadata_->>'fileId' IS DISTINCT FROM job.request->>'targetId' THEN RAISE EXCEPTION 'GOOGLE_RESOURCE_DENIED' USING ERRCODE='42501'; END IF;
   rid:='google:'||encode(sha256(convert_to(metadata_->>'fileId','UTF8')),'hex');
   IF EXISTS(SELECT 1 FROM clara_native_resource_authority WHERE resource_kind='document' AND resource_id=rid AND revoked_at IS NULL AND (owner_user_id<>actor OR workspace_id<>w OR client_id<>c OR project_id<>p)) THEN RAISE EXCEPTION 'GOOGLE_RESOURCE_SCOPE_CONFLICT' USING ERRCODE='42501'; END IF;
   UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='document' AND resource_id=rid AND revoked_at IS NULL;
   INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason,metadata) VALUES('document',rid,actor,w,c,p,encode(sha256(convert_to(metadata_::text,'UTF8')),'hex'),actor,'Confirmed Google write and current version bound to the selected Mission',metadata_);
  END IF;
  PERFORM clara_native_runtime_command(digest,w,c,p,s,'commit',payload->'commit');
  UPDATE clara_external_event_jobs SET status='completed',phase='confirmed',result=payload->'result',updated_at=clock_timestamp() WHERE job_id=jid;
  UPDATE clara_tool_approvals SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=jid AND status='PROCESSING';RETURN payload->'result';
 ELSE RAISE EXCEPTION 'GOOGLE_OPERATION_INVALID' USING ERRCODE='22023'; END IF;
 entry_:=payload->'journal';
 IF entry_ IS NOT NULL THEN
  INSERT INTO clara_journal_entries(id,entry,created_at) VALUES(entry_->>'id',entry_,(entry_->>'createdAt')::timestamptz);
  INSERT INTO clara_native_journal_scope VALUES(entry_->>'id',s,actor,w,c,p);
 END IF;
 RETURN jsonb_build_object('operationId',payload->>'operationId','owned',operation='claim','status',CASE WHEN operation='prepare' THEN 'queued' WHEN operation='claim' THEN 'processing' WHEN operation IN ('refuse','cancel') THEN 'failed' ELSE 'uncertain' END);
END $$;
REVOKE ALL ON FUNCTION clara_native_google_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_native_google_work_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
