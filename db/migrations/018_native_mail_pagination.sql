-- Additive function update only: no message copy, deletion or reassignment.
-- Requires 016 and 017. Preserve all existing authority and delivery checks.
BEGIN;
CREATE OR REPLACE FUNCTION clara_native_mail_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v JSONB; actor TEXT; conn TEXT:=payload->>'connectionId'; a clara_native_mail_authority; msg clara_native_mail_messages; bind clara_native_mail_bindings; cursor_row clara_native_mail_sync; op clara_native_mail_operations; m JSONB; item JSONB; target TEXT; result JSONB; hash TEXT; mid TEXT;
BEGIN
 v:=clara_native_runtime_command(digest,w,c,p,s,'read','{}');actor:=v->>'userId';
 IF operation='list' THEN
  RETURN jsonb_build_object('connections',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',ma.connection_id,'address',ma.address,'owned',ma.owner_user_id=actor,'revision',ma.revision)) FROM clara_native_mail_authority ma JOIN clara_connections co ON co.id=ma.connection_id AND co.provider='ionos' AND co.workspace_id=w AND co.status='ACTIVE' WHERE ma.workspace_id=w AND ma.revoked_at IS NULL AND EXISTS(SELECT 1 FROM clara_auth_identities WHERE user_id=ma.owner_user_id) AND EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=ma.owner_user_id AND workspace_id=w AND revoked_at IS NULL) AND EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.user_id=ca.user_id AND pa.workspace_id=ca.workspace_id WHERE ca.user_id=ma.owner_user_id AND ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.can_read AND pa.can_read AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL) AND (ma.owner_user_id=actor OR EXISTS(SELECT 1 FROM clara_native_mail_delegations d WHERE d.connection_id=ma.connection_id AND d.user_id=actor AND d.workspace_id=w AND d.client_id=c AND d.project_id=p AND d.revoked_at IS NULL))),'[]'::jsonb));
 END IF;
 SELECT * INTO a FROM clara_native_mail_authority WHERE connection_id=conn AND workspace_id=w AND revoked_at IS NULL FOR UPDATE;
 IF a.connection_id IS NULL OR NOT EXISTS(SELECT 1 FROM clara_connections WHERE id=conn AND workspace_id=w AND provider='ionos' AND status='ACTIVE')
 OR NOT EXISTS(SELECT 1 FROM clara_auth_identities WHERE user_id=a.owner_user_id)
 OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=a.owner_user_id AND workspace_id=w AND revoked_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.user_id=ca.user_id AND pa.workspace_id=ca.workspace_id WHERE ca.user_id=a.owner_user_id AND ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.can_read AND pa.can_read AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL)
 OR (actor<>a.owner_user_id AND NOT EXISTS(SELECT 1 FROM clara_native_mail_delegations WHERE connection_id=conn AND user_id=actor AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL)) THEN RAISE EXCEPTION 'MAIL_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF payload ? 'revision' AND (payload->>'revision')::bigint<>a.revision THEN RAISE EXCEPTION 'MAIL_AUTHORITY_CHANGED' USING ERRCODE='40001'; END IF;
 IF operation='authority' THEN RETURN jsonb_build_object('revision',a.revision,'address',a.address,'owned',actor=a.owner_user_id); END IF;
 IF operation IN ('delegate','revokeDelegation','revoke','sync','approve','claim','attempt','finish') AND actor<>a.owner_user_id THEN RAISE EXCEPTION 'MAIL_OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF operation NOT IN ('messages','message','cursor','operations','review','credentials','authority','attempt') AND v->>'canWrite'<>'true' THEN RAISE EXCEPTION 'MAIL_WRITE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='credentials' THEN RETURN jsonb_build_object('encryptedPayload',(SELECT encrypted_payload FROM clara_connection_credentials WHERE connection_id=conn));
 ELSIF operation IN ('delegate','revokeDelegation') THEN
  target:=payload->>'userId';
  IF operation='delegate' THEN
   IF target=actor OR NOT EXISTS(SELECT 1 FROM clara_auth_identities WHERE user_id=target) OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=target AND workspace_id=w AND revoked_at IS NULL) OR NOT EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.user_id=ca.user_id AND pa.workspace_id=ca.workspace_id WHERE ca.user_id=target AND ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.can_read AND pa.can_read AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL) THEN RAISE EXCEPTION 'MAIL_DELEGATION_DENIED' USING ERRCODE='42501'; END IF;
   INSERT INTO clara_native_mail_delegations(connection_id,user_id,workspace_id,client_id,project_id,granted_by) VALUES(conn,target,w,c,p,actor);
  ELSE UPDATE clara_native_mail_delegations SET revoked_at=clock_timestamp() WHERE connection_id=conn AND user_id=target AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL; END IF;
 ELSIF operation='revoke' THEN UPDATE clara_native_mail_authority SET revoked_at=clock_timestamp(),revision=revision+1 WHERE connection_id=conn;
 ELSIF operation='cursor' THEN
  RETURN COALESCE((SELECT to_jsonb(x) FROM clara_native_mail_sync x WHERE connection_id=conn AND folder=payload->>'folder'),'{}');
 ELSIF operation='sync' THEN
  SELECT * INTO cursor_row FROM clara_native_mail_sync WHERE connection_id=conn AND folder=payload->>'folder' FOR UPDATE;
  IF COALESCE(cursor_row.revision,0)<>COALESCE((payload->>'cursorRevision')::bigint,0) THEN RAISE EXCEPTION 'MAIL_SYNC_CONFLICT' USING ERRCODE='40001'; END IF;
  IF jsonb_array_length(payload->'messages')>25 OR jsonb_array_length(payload->'uids')>5000 OR length(payload->>'folder') NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'MAIL_SYNC_LIMIT' USING ERRCODE='22023'; END IF;
  UPDATE clara_native_mail_messages SET available=false WHERE connection_id=conn AND folder=payload->>'folder' AND (uid_validity<>payload->>'uidValidity' OR NOT (payload->'uids' @> to_jsonb(uid)));
  IF (SELECT COUNT(*) FROM clara_native_mail_messages WHERE connection_id=conn)+jsonb_array_length(payload->'messages')>500 THEN RAISE EXCEPTION 'MAIL_RETENTION_LIMIT_REVIEW_REQUIRED' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(payload->'messages') LOOP
   IF length(item->>'encryptedPayload')>1500000 OR (item->>'uid')::bigint<=0 THEN RAISE EXCEPTION 'MAIL_MESSAGE_LIMIT' USING ERRCODE='22023'; END IF;
   INSERT INTO clara_native_mail_messages(id,connection_id,folder,uid_validity,uid,encrypted_payload) VALUES(item->>'id',conn,payload->>'folder',payload->>'uidValidity',(item->>'uid')::bigint,item->>'encryptedPayload')
   ON CONFLICT(connection_id,folder,uid_validity,uid) DO UPDATE SET available=true,updated_at=clock_timestamp();
  END LOOP;
  INSERT INTO clara_native_mail_sync(connection_id,folder,uid_validity,last_uid) VALUES(conn,payload->>'folder',payload->>'uidValidity',(payload->>'lastUid')::bigint)
  ON CONFLICT(connection_id,folder) DO UPDATE SET uid_validity=EXCLUDED.uid_validity,last_uid=EXCLUDED.last_uid,revision=clara_native_mail_sync.revision+1;
 ELSIF operation='messages' THEN
  -- Immutable message IDs provide a stable keyset even when sync updates timestamps.
  IF payload ? 'beforeId' AND (payload->>'beforeId') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'MAIL_INVALID_CURSOR' USING ERRCODE='22023'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.id DESC),'[]'::jsonb) INTO result FROM (
   SELECT mm.id,mm.available,mm.encrypted_payload FROM clara_native_mail_messages mm
   LEFT JOIN clara_native_mail_bindings bb ON bb.message_id=mm.id
   WHERE mm.connection_id=conn AND mm.available
    AND ((bb.message_id IS NULL AND actor=a.owner_user_id) OR (bb.workspace_id=w AND bb.client_id=c AND bb.project_id=p AND bb.revoked_at IS NULL))
    AND (NOT payload ? 'beforeId' OR mm.id < payload->>'beforeId')
   ORDER BY mm.id DESC LIMIT 51
  ) x;
  RETURN jsonb_build_object('messages',(SELECT COALESCE(jsonb_agg(e.value ORDER BY e.ordinality),'[]'::jsonb) FROM jsonb_array_elements(result) WITH ORDINALITY e WHERE e.ordinality<=50),
   'nextCursor',CASE WHEN jsonb_array_length(result)>50 THEN result#>>'{49,id}' ELSE NULL END);
 ELSIF operation IN ('message','bind','commit','createContact') THEN
  SELECT * INTO msg FROM clara_native_mail_messages WHERE id=payload->>'messageId' AND connection_id=conn AND available FOR UPDATE;
  SELECT * INTO bind FROM clara_native_mail_bindings WHERE message_id=msg.id;
  IF msg.id IS NULL OR (bind.message_id IS NULL AND actor<>a.owner_user_id) OR (bind.message_id IS NOT NULL AND (bind.workspace_id<>w OR bind.client_id<>c OR bind.project_id<>p OR bind.revoked_at IS NOT NULL)) THEN RAISE EXCEPTION 'MAIL_MESSAGE_DENIED' USING ERRCODE='42501'; END IF;
  IF operation='message' THEN RETURN to_jsonb(msg); END IF;
  IF operation='createContact' THEN
   IF (bind.message_id IS NULL AND actor<>a.owner_user_id) OR payload#>>'{intake,source,system}' IS DISTINCT FROM 'clara-os' OR payload#>>'{intake,source,channel}' IS DISTINCT FROM 'email-reviewed' OR length(payload#>>'{intake,contact,name}') NOT BETWEEN 1 AND 160 OR length(payload#>>'{intake,contact,email}') NOT BETWEEN 3 AND 254 THEN RAISE EXCEPTION 'MAIL_CONTACT_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
   target:=payload#>>'{intake,submissionId}';
   IF target IS NULL OR target NOT LIKE 'mail-contact:%' THEN RAISE EXCEPTION 'MAIL_CONTACT_REVIEW_REQUIRED' USING ERRCODE='42501'; END IF;
   INSERT INTO clara_project_intake_inbox(workspace_id,submission_id,product_id,session_key,event_id,intake) VALUES(w,target,'clara-os',s,payload->>'eventId',payload->'intake');
   INSERT INTO clara_acquisition_records(workspace_id,submission_id,qualification,decision_brief,lifecycle) VALUES(w,target,payload->'qualification',payload->'decisionBrief',payload->'lifecycle');
   INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
    VALUES('acquisition',w||'/'||target,actor,w,c,p,encode(sha256(convert_to(clara_native_acquisition_snapshot(w,target)::text,'UTF8')),'hex'),actor,'Contact explicitly created after mailbox and client/project review; never inferred from email');
  ELSIF operation='bind' THEN
   IF (bind.message_id IS NULL AND actor<>a.owner_user_id) OR v#>>'{session,mission,id}' IS NULL OR v#>>'{session,acquisitionSubmissionId}' IS NULL THEN RAISE EXCEPTION 'MAIL_EXPLICIT_CONTACT_MISSION_REQUIRED' USING ERRCODE='42501'; END IF;
   INSERT INTO clara_native_mail_bindings(message_id,workspace_id,client_id,project_id,owner_user_id) VALUES(msg.id,w,c,p,actor) ON CONFLICT(message_id) DO NOTHING;
  ELSE
   IF bind.message_id IS NULL OR v#>>'{session,mission,id}' IS NULL THEN RAISE EXCEPTION 'MAIL_BINDING_REQUIRED' USING ERRCODE='42501'; END IF;
  END IF;
 ELSIF operation IN ('submit','approve','claim','attempt','finish','review','operations') THEN
  IF operation='operations' THEN RETURN jsonb_build_object('operations',COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT id,message_id,mission_id,state,created_at,updated_at FROM clara_native_mail_operations WHERE connection_id=conn AND workspace_id=w AND client_id=c AND project_id=p AND (prepared_by=actor OR actor=a.owner_user_id) ORDER BY created_at DESC LIMIT 50)x),'[]'::jsonb)); END IF;
  IF operation='submit' THEN
   IF EXISTS(SELECT 1 FROM clara_native_mail_operations WHERE connection_id=conn AND message_id=payload->>'messageId' AND state IN ('processing','uncertain')) THEN RAISE EXCEPTION 'MAIL_RECONCILIATION_REQUIRED' USING ERRCODE='42501'; END IF;
   mid:=v#>>'{session,mission,id}';m:=v#>'{session,mission}';
   IF mid IS NULL OR m#>>'{emailDraft,connectionId}' IS DISTINCT FROM conn OR m#>>'{emailDraft,sender,email}' IS DISTINCT FROM a.address OR m#>>'{emailDraft,schema}' IS DISTINCT FROM 'clara.mailbox-communication-draft.v2' OR m#>>'{emailDraft,messageId}' IS DISTINCT FROM payload->>'messageId' OR NOT EXISTS(SELECT 1 FROM clara_native_mail_bindings WHERE message_id=payload->>'messageId' AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL) THEN RAISE EXCEPTION 'MAIL_DRAFT_DENIED' USING ERRCODE='42501'; END IF;
   hash:=encode(sha256(convert_to((m->'emailDraft')::text,'UTF8')),'hex');
   INSERT INTO clara_native_mail_operations(id,connection_id,message_id,workspace_id,client_id,project_id,mission_id,prepared_by,draft_hash,authority_revision,encrypted_snapshot,state) VALUES(payload->>'operationId',conn,payload->>'messageId',w,c,p,mid,actor,hash,a.revision,payload->>'encryptedSnapshot','pending');
  ELSE
   SELECT * INTO op FROM clara_native_mail_operations WHERE id=payload->>'operationId' AND connection_id=conn AND workspace_id=w AND client_id=c AND project_id=p AND (prepared_by=actor OR actor=a.owner_user_id) FOR UPDATE;
   IF op.id IS NULL THEN RAISE EXCEPTION 'MAIL_OPERATION_DENIED' USING ERRCODE='42501'; END IF;
   IF operation='finish' THEN
    IF op.state<>'processing' OR op.attempt_id IS DISTINCT FROM payload->>'attemptId' OR payload->>'state' NOT IN ('sent','failed','uncertain') THEN RAISE EXCEPTION 'MAIL_ATTEMPT_DENIED' USING ERRCODE='42501'; END IF;
    UPDATE clara_native_mail_operations SET state=payload->>'state',updated_at=clock_timestamp() WHERE id=op.id;
    UPDATE clara_tool_approvals SET status=CASE WHEN payload->>'state'='sent' THEN 'SUCCEEDED' ELSE 'FAILED' END,completed_at=clock_timestamp() WHERE id=op.approval_id AND status='PROCESSING';
   ELSE
    SELECT data INTO m FROM clara_missions WHERE id=op.mission_id FOR SHARE;
    IF op.authority_revision<>a.revision OR op.draft_hash IS DISTINCT FROM encode(sha256(convert_to((m->'emailDraft')::text,'UTF8')),'hex') OR NOT EXISTS(SELECT 1 FROM clara_native_resource_authority WHERE resource_kind='mission' AND resource_id=op.mission_id AND owner_user_id=op.prepared_by AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL AND snapshot_sha256=encode(sha256(convert_to(m::text,'UTF8')),'hex'))
    OR NOT EXISTS(SELECT 1 FROM clara_auth_identities WHERE user_id=op.prepared_by)
    OR NOT EXISTS(SELECT 1 FROM clara_workspace_memberships WHERE user_id=op.prepared_by AND workspace_id=w AND revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.user_id=ca.user_id AND pa.workspace_id=ca.workspace_id WHERE ca.user_id=op.prepared_by AND ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.can_read AND ca.can_manage AND pa.can_read AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_native_mail_bindings WHERE message_id=op.message_id AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM clara_native_resource_authority WHERE resource_kind='acquisition' AND resource_id=w||'/'||(m->>'acquisitionSubmissionId') AND owner_user_id=op.prepared_by AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL AND snapshot_sha256=encode(sha256(convert_to(clara_native_acquisition_snapshot(w,m->>'acquisitionSubmissionId')::text,'UTF8')),'hex'))
    OR NOT EXISTS(SELECT 1 FROM clara_native_mail_messages WHERE id=op.message_id AND available) OR (op.prepared_by<>a.owner_user_id AND NOT EXISTS(SELECT 1 FROM clara_native_mail_delegations WHERE connection_id=conn AND user_id=op.prepared_by AND workspace_id=w AND client_id=c AND project_id=p AND revoked_at IS NULL)) THEN RAISE EXCEPTION 'MAIL_APPROVAL_INVALIDATED' USING ERRCODE='42501'; END IF;
    IF operation='review' THEN RETURN jsonb_build_object('encryptedSnapshot',op.encrypted_snapshot,'state',op.state,'messageId',op.message_id); END IF;
    IF operation='approve' THEN
     IF op.state NOT IN ('pending','approved') OR actor<>a.owner_user_id THEN RAISE EXCEPTION 'MAIL_OWNER_APPROVAL_REQUIRED' USING ERRCODE='42501'; END IF;
     UPDATE clara_tool_approvals SET status='REJECTED',completed_at=clock_timestamp() WHERE id=op.approval_id AND status='PENDING';
     INSERT INTO clara_tool_approvals(id,token_hash,call_id,capability_id,arguments,actor_id,workspace_id,expires_at) VALUES(payload->>'approvalId',payload->>'tokenHash',op.id,'commercial-email.send',op.draft_hash,actor,w,clock_timestamp()+INTERVAL '10 minutes');
     UPDATE clara_native_mail_operations SET state='approved',approval_id=payload->>'approvalId',updated_at=clock_timestamp() WHERE id=op.id;
    ELSIF operation='claim' THEN
     IF EXISTS(SELECT 1 FROM clara_native_mail_operations WHERE connection_id=conn AND message_id=op.message_id AND id<>op.id AND state IN ('processing','uncertain')) THEN RAISE EXCEPTION 'MAIL_RECONCILIATION_REQUIRED' USING ERRCODE='42501'; END IF;
     IF op.state<>'approved' OR actor<>a.owner_user_id THEN RAISE EXCEPTION 'MAIL_APPROVAL_REQUIRED' USING ERRCODE='42501'; END IF;
     UPDATE clara_tool_approvals SET status='PROCESSING' WHERE id=op.approval_id AND token_hash=payload->>'tokenHash' AND call_id=op.id AND arguments=op.draft_hash AND actor_id=actor AND workspace_id=w AND capability_id='commercial-email.send' AND status='PENDING' AND expires_at>clock_timestamp();
     IF NOT FOUND THEN RAISE EXCEPTION 'MAIL_APPROVAL_EXPIRED' USING ERRCODE='42501'; END IF;
     UPDATE clara_native_mail_operations SET state='processing',attempt_id=payload->>'attemptId',updated_at=clock_timestamp() WHERE id=op.id;
     result:=jsonb_build_object('encryptedSnapshot',op.encrypted_snapshot);
    ELSIF operation='attempt' THEN
     IF op.state<>'processing' OR op.attempt_id IS DISTINCT FROM payload->>'attemptId' THEN RAISE EXCEPTION 'MAIL_ATTEMPT_DENIED' USING ERRCODE='42501'; END IF;
    END IF;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'MAIL_UNKNOWN_OPERATION' USING ERRCODE='22023'; END IF;
 IF payload ? 'commit' THEN PERFORM clara_native_runtime_command(digest,w,c,p,s,'commit',payload->'commit'); END IF;
 RETURN COALESCE(result,'{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION clara_native_mail_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
