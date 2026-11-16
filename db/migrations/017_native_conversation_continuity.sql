-- Additive store extension. No historical backfill, TTL deletion or Production startup DDL.
-- Depends on 007 and 014; 012-016 are unchanged. Apply only after reviewed backup.
BEGIN;
ALTER TABLE clara_external_event_jobs ADD COLUMN IF NOT EXISTS job_kind TEXT NOT NULL DEFAULT 'external-event'
 CHECK(job_kind IN ('external-event','native-chat'));
CREATE TABLE IF NOT EXISTS clara_native_conversation_messages (
 session_id TEXT NOT NULL REFERENCES clara_sessions(id), ordinal BIGINT NOT NULL CHECK(ordinal>0),
 message_id TEXT NOT NULL, message JSONB NOT NULL,
 PRIMARY KEY(session_id,ordinal), UNIQUE(session_id,message_id)
);
CREATE OR REPLACE FUNCTION clara_native_archive_messages(s TEXT,messages JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE m JSONB; prior JSONB; n BIGINT;
BEGIN
 SELECT COALESCE(MAX(ordinal),0) INTO n FROM clara_native_conversation_messages WHERE session_id=s;
 FOR m IN SELECT value FROM jsonb_array_elements(messages) LOOP
  IF COALESCE(length(m->>'id'),0) NOT BETWEEN 1 AND 160 OR m->>'role' NOT IN ('user','clara')
   OR jsonb_typeof(m->'content') IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'INVALID_CONVERSATION_MESSAGE' USING ERRCODE='22023'; END IF;
  SELECT message INTO prior FROM clara_native_conversation_messages WHERE session_id=s AND message_id=m->>'id';
  IF FOUND THEN
   IF prior IS DISTINCT FROM m THEN RAISE EXCEPTION 'CONVERSATION_MESSAGE_CONFLICT' USING ERRCODE='23505'; END IF;
  ELSE
   n:=n+1;INSERT INTO clara_native_conversation_messages VALUES(s,n,m->>'id',m);
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION clara_native_archive_messages(TEXT,JSONB) FROM PUBLIC;
CREATE OR REPLACE FUNCTION clara_native_history(s TEXT,before_ordinal BIGINT,page_size INT,cache JSONB)
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER AS $$
 WITH saved AS (SELECT ordinal,message FROM clara_native_conversation_messages WHERE session_id=s AND ordinal<before_ordinal ORDER BY ordinal DESC LIMIT page_size+1),
 extra AS (SELECT COALESCE((SELECT MAX(ordinal) FROM clara_native_conversation_messages WHERE session_id=s),0)+row_number() OVER(ORDER BY item.pos) AS ordinal,item.m AS message
 FROM jsonb_array_elements(COALESCE(cache,'[]'::jsonb)) WITH ORDINALITY item(m,pos)
 WHERE NOT EXISTS(SELECT 1 FROM clara_native_conversation_messages saved WHERE saved.session_id=s AND saved.message_id=item.m->>'id')),
 page AS (SELECT * FROM (SELECT ordinal,message FROM saved UNION ALL SELECT ordinal,message FROM extra) history
 WHERE ordinal<before_ordinal ORDER BY ordinal DESC LIMIT page_size+1),
 visible AS (SELECT * FROM page ORDER BY ordinal DESC LIMIT page_size)
 SELECT jsonb_build_object('messages',COALESCE((SELECT jsonb_agg(message ORDER BY ordinal) FROM visible),'[]'::jsonb),
 'before',CASE WHEN (SELECT count(*) FROM page)>page_size THEN (SELECT min(ordinal)::text FROM visible) END)
$$;
REVOKE ALL ON FUNCTION clara_native_history(TEXT,BIGINT,INT,JSONB) FROM PUBLIC;
CREATE OR REPLACE FUNCTION clara_native_runtime_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE cursor_ BIGINT; actor TEXT; ns JSONB; sid TEXT; row RECORD; mid TEXT; m JSONB; bound RECORD; acquisition JSONB; submission TEXT; expected_acquisition JSONB; next_draft JSONB;
BEGIN
 -- Same workspace-first lock order as the canonical registry. Recheck authority
 -- at commit, not only before the asynchronous Brain cycle.
 PERFORM 1 FROM clara_auth_workspaces WHERE id=w FOR UPDATE;
 SELECT a.user_id INTO actor FROM clara_auth_sessions a
 JOIN clara_workspace_memberships mm ON mm.user_id=a.user_id AND mm.workspace_id=w AND mm.revoked_at IS NULL
 JOIN clara_registry_clients cc ON cc.workspace_id=w AND cc.id=c AND cc.revoked_at IS NULL
 JOIN clara_registry_projects pp ON pp.workspace_id=w AND pp.id=p AND pp.client_id=c AND pp.revoked_at IS NULL
 JOIN clara_registry_client_access ca ON ca.workspace_id=w AND ca.client_id=c AND ca.user_id=a.user_id AND ca.can_read AND ca.revoked_at IS NULL
 JOIN clara_registry_project_access pa ON pa.workspace_id=w AND pa.project_id=p AND pa.user_id=a.user_id AND pa.can_read AND pa.revoked_at IS NULL
 WHERE a.token_hash=digest AND a.revoked_at IS NULL AND a.expires_at>clock_timestamp()
 AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=a.user_id)
 FOR SHARE OF a,mm,cc,pp,ca,pa;
 IF actor IS NULL THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM clara_auth_identities WHERE user_id=actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation NOT IN ('read','list','document','write','create','commit','history') THEN RAISE EXCEPTION 'INVALID_NATIVE_COMMAND' USING ERRCODE='22023'; END IF;
 IF operation NOT IN ('read','list','document','history') AND NOT EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id
 WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_WRITE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='list' THEN
  RETURN jsonb_build_object('protocolVersion',2,'canWrite',EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL),'sessions',(SELECT COALESCE(jsonb_agg(jsonb_build_object('sessionId',ns.id,'updatedAt',ns.updated_at) ORDER BY ns.updated_at DESC),'[]'::jsonb)
  FROM clara_sessions ns JOIN clara_native_resource_authority b ON b.resource_kind='session' AND b.resource_id=ns.id AND b.revoked_at IS NULL
  WHERE b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND clara_native_read_session(digest,w,c,p,ns.id) IS NOT NULL));
 END IF;
 IF operation='create' THEN
  sid:='native:'||gen_random_uuid()::text;
  ns:=jsonb_build_object('state','STARTING','recommendation',NULL,'brainDashboard',NULL,'mission',NULL,'sources','[]'::jsonb,'user',jsonb_build_object('firstName',NULL),'conversation','[]'::jsonb,'startedAt',clock_timestamp(),'updatedAt',clock_timestamp());
  INSERT INTO clara_sessions(id,data) VALUES(sid,ns);
  INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
  VALUES('session',sid,actor,w,c,p,encode(sha256(convert_to(ns::text,'UTF8')),'hex'),actor,'New native session created in explicit canonical scope');
  RETURN jsonb_build_object('sessionId',sid,'protocolVersion',2);
 END IF;
 ns:=clara_native_read_session(digest,w,c,p,s);
 IF ns IS NULL THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation IN ('write','commit') AND NOT (
  (ns#>>'{mission,id}' IS NOT NULL AND COALESCE(ns->>'nativeMissionId'=ns#>>'{mission,id}',false))
  OR (ns#>>'{mission,id}' IS NULL AND jsonb_array_length(COALESCE(ns->'conversation','[]'::jsonb))=0
   AND COALESCE(ns->'brainDashboard','null'::jsonb)='null'::jsonb AND COALESCE(ns->'recommendation','null'::jsonb)='null'::jsonb
   AND jsonb_array_length(COALESCE(ns->'sources','[]'::jsonb))=0 AND jsonb_array_length(COALESCE(ns->'documentReferences','[]'::jsonb))=0)
 ) THEN RAISE EXCEPTION 'NATIVE_THREAD_REVIEW_REQUIRED' USING ERRCODE='40001'; END IF;
 IF operation='history' THEN
  IF payload->>'beforeMessageId' IS NOT NULL THEN
   SELECT ordinal INTO cursor_ FROM clara_native_conversation_messages WHERE session_id=s AND message_id=payload->>'beforeMessageId';
   IF NOT FOUND THEN SELECT item.pos INTO cursor_ FROM jsonb_array_elements(ns->'conversation') WITH ORDINALITY item(m,pos) WHERE item.m->>'id'=payload->>'beforeMessageId'; END IF;
   IF cursor_ IS NULL THEN RAISE EXCEPTION 'HISTORY_CURSOR_UNAVAILABLE' USING ERRCODE='40001'; END IF;
  END IF;
  RETURN clara_native_history(s,COALESCE(cursor_,(payload->>'before')::bigint,9223372036854775807),LEAST(100,GREATEST(1,COALESCE((payload->>'limit')::int,50))),ns->'conversation');
 END IF;
 IF operation='document' THEN
  IF NOT EXISTS(SELECT 1 FROM clara_native_resource_authority b WHERE b.resource_kind='document' AND b.resource_id=payload->>'fileId' AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
  -- Canonical ownership is not a proof of the connected Google principal's
  -- current Drive rights or of the content revision. Never unlock content here.
  RETURN jsonb_build_object('osBindingVerified',true,'driveRightsVerified',false,'contentRevisionVerified',false,'readAllowed',false);
 END IF;
 IF operation='commit' THEN
  IF ns IS DISTINCT FROM payload->'expected' THEN RAISE EXCEPTION 'NATIVE_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(payload->'session')<>'object' OR jsonb_typeof(payload->'missions')<>'array' OR jsonb_typeof(payload->'journal')<>'array' THEN RAISE EXCEPTION 'INVALID_NATIVE_COMMIT' USING ERRCODE='22023'; END IF;
  -- A proven thread never changes Mission; unknown historical turns are not attributed.
  IF (ns#>>'{mission,id}' IS NOT NULL AND ns#>>'{mission,id}' IS DISTINCT FROM payload#>>'{session,mission,id}')
   OR (ns#>>'{mission,id}' IS NULL AND payload#>>'{session,mission,id}' IS NOT NULL
    AND (jsonb_array_length(COALESCE(ns->'conversation','[]'::jsonb))>0
      OR COALESCE(ns->'brainDashboard','null'::jsonb)<>'null'::jsonb OR COALESCE(ns->'recommendation','null'::jsonb)<>'null'::jsonb
      OR jsonb_array_length(COALESCE(ns->'sources','[]'::jsonb))>0 OR jsonb_array_length(COALESCE(ns->'documentReferences','[]'::jsonb))>0)) THEN
   RAISE EXCEPTION 'NATIVE_THREAD_MISSION_BOUND' USING ERRCODE='40001';
  END IF;
  payload:=jsonb_set(payload,'{session,nativeMissionId}',COALESCE(payload#>'{session,mission,id}','null'::jsonb));
  -- Append old cache AND next window before overwriting Session. Same transaction.
  PERFORM clara_native_archive_messages(s,COALESCE(ns->'conversation','[]'::jsonb)||COALESCE(payload#>'{session,conversation}','[]'::jsonb));
  payload:=jsonb_set(payload,'{session,conversation}',COALESCE((SELECT jsonb_agg(cached.m ORDER BY cached.pos) FROM jsonb_array_elements(payload#>'{session,conversation}') WITH ORDINALITY cached(m,pos) WHERE cached.pos>jsonb_array_length(payload#>'{session,conversation}')-100),'[]'::jsonb));
  -- Revalidate selected intake and all staged draft revisions in the SAME
  -- transaction as Session/Mission/Journal. No second-read atomicity claim.
  submission:=payload#>>'{session,acquisitionSubmissionId}';
  IF submission IS NOT NULL THEN
   PERFORM 1 FROM clara_acquisition_records a JOIN clara_project_intake_inbox i
   ON i.workspace_id=a.workspace_id AND i.submission_id=a.submission_id
   WHERE a.workspace_id=w AND a.submission_id=submission FOR UPDATE OF a,i;
   PERFORM 1 FROM clara_native_resource_authority b WHERE b.resource_kind='acquisition'
    AND b.resource_id=w||'/'||submission AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p
    AND b.revoked_at IS NULL AND b.snapshot_sha256=encode(sha256(convert_to(clara_native_acquisition_snapshot(w,submission)::text,'UTF8')),'hex') FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'NATIVE_ACQUISITION_DENIED' USING ERRCODE='42501'; END IF;
   expected_acquisition:=payload->'expectedAcquisitions'->submission;
   IF expected_acquisition IS NULL OR expected_acquisition IS DISTINCT FROM clara_native_acquisition_snapshot(w,submission) THEN
    RAISE EXCEPTION 'NATIVE_ACQUISITION_REVISION_CONFLICT' USING ERRCODE='40001';
   END IF;
  END IF;
  IF jsonb_array_length(COALESCE(payload->'acquisitions','[]'::jsonb))>1 THEN RAISE EXCEPTION 'INVALID_NATIVE_COMMIT' USING ERRCODE='22023'; END IF;
  FOR acquisition IN SELECT value FROM jsonb_array_elements(COALESCE(payload->'acquisitions','[]'::jsonb)) LOOP
   IF submission IS NULL OR acquisition->>'submissionId' IS DISTINCT FROM submission THEN
    RAISE EXCEPTION 'NATIVE_ACQUISITION_DENIED' USING ERRCODE='42501'; END IF;
   next_draft:=acquisition->'draft';
   IF (acquisition->>'revisionSteps')::integer NOT BETWEEN 1 AND 10 OR acquisition->>'revisionSteps' IS NULL
    OR next_draft->>'schema' IS DISTINCT FROM 'clara.commercial-communication-draft.v1'
    OR next_draft->>'submissionId' IS DISTINCT FROM submission
    OR next_draft#>>'{recipient,email}' IS DISTINCT FROM expected_acquisition#>>'{intake,contact,email}'
    OR next_draft#>>'{recipient,name}' IS DISTINCT FROM expected_acquisition#>>'{intake,contact,name}'
    OR next_draft#>>'{sender,email}' IS DISTINCT FROM 'clara@melodie.digital'
    OR next_draft#>>'{approval,status}' IS DISTINCT FROM 'pending'
    OR next_draft#>>'{delivery,allowed}' IS DISTINCT FROM 'false'
    OR (next_draft->>'revision')::integer IS DISTINCT FROM COALESCE((expected_acquisition#>>'{record,commercial_draft,revision}')::integer,0)+(acquisition->>'revisionSteps')::integer THEN
    RAISE EXCEPTION 'INVALID_NATIVE_COMMERCIAL_DRAFT' USING ERRCODE='22023'; END IF;
   UPDATE clara_acquisition_records SET commercial_draft=next_draft,updated_at=NOW()
    WHERE workspace_id=w AND submission_id=submission;
   UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp()
    WHERE resource_kind='acquisition' AND resource_id=w||'/'||submission AND revoked_at IS NULL;
   INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
    VALUES('acquisition',w||'/'||submission,actor,w,c,p,encode(sha256(convert_to(clara_native_acquisition_snapshot(w,submission)::text,'UTF8')),'hex'),actor,'Owned commercial draft revision committed with scoped Session Mission and Journal');
  END LOOP;
  -- All resources are created from the authenticated request or already owned;
  -- collisions with historical/foreign IDs never upsert or claim them.
  FOR m IN SELECT value FROM jsonb_array_elements(payload->'missions') LOOP
   mid:=m->>'id'; IF mid IS NULL OR (mid NOT LIKE 'native:%' AND NOT EXISTS(SELECT 1 FROM clara_missions WHERE id=mid)) THEN RAISE EXCEPTION 'INVALID_NATIVE_MISSION' USING ERRCODE='22023'; END IF;
   SELECT * INTO bound FROM clara_native_resource_authority WHERE resource_kind='mission' AND resource_id=mid AND revoked_at IS NULL;
   IF EXISTS(SELECT 1 FROM clara_missions WHERE id=mid) AND (bound.binding_id IS NULL OR bound.owner_user_id<>actor OR bound.workspace_id<>w OR bound.client_id<>c OR bound.project_id<>p
    OR bound.snapshot_sha256<>(SELECT encode(sha256(convert_to(data::text,'UTF8')),'hex') FROM clara_missions WHERE id=mid)) THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
   INSERT INTO clara_missions(id,data) VALUES(mid,m) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=NOW();
   UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='mission' AND resource_id=mid AND revoked_at IS NULL;
   INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
   VALUES('mission',mid,actor,w,c,p,encode(sha256(convert_to(m::text,'UTF8')),'hex'),actor,'Owned native mission version committed through scoped runtime');
   -- Refresh only proven, untampered owned native references. This does not
   -- attribute legacy history or copy another user's/project's mission.
   FOR row IN SELECT ns.id FROM clara_sessions ns JOIN clara_native_resource_authority b
    ON b.resource_kind='session' AND b.resource_id=ns.id AND b.revoked_at IS NULL
    WHERE ns.id<>s AND ns.id LIKE 'native:%' AND ns.data#>>'{mission,id}'=mid
    AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p
    AND b.snapshot_sha256=encode(sha256(convert_to(ns.data::text,'UTF8')),'hex') FOR UPDATE OF ns,b LOOP
    UPDATE clara_sessions SET data=jsonb_set(jsonb_set(data,'{mission}',m),'{updatedAt}',to_jsonb(clock_timestamp())),updated_at=NOW() WHERE id=row.id;
    UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='session' AND resource_id=row.id AND revoked_at IS NULL;
    INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
    SELECT 'session',id,actor,w,c,p,encode(sha256(convert_to(data::text,'UTF8')),'hex'),actor,'Owned native mission reference refreshed without changing conversation history' FROM clara_sessions WHERE id=row.id;
   END LOOP;

  END LOOP;
  mid:=payload#>>'{session,mission,id}';
  IF mid IS NOT NULL AND submission IS NOT NULL AND payload#>>'{session,mission,acquisitionSubmissionId}' IS DISTINCT FROM submission THEN RAISE EXCEPTION 'NATIVE_ACQUISITION_MISSION_MISMATCH' USING ERRCODE='42501'; END IF;
  IF mid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM clara_missions mm JOIN clara_native_resource_authority b ON b.resource_kind='mission' AND b.resource_id=mm.id AND b.revoked_at IS NULL
   WHERE mm.id=mid AND mm.data=payload#>'{session,mission}' AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p) THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(payload->'journal') LOOP
   IF EXISTS(SELECT 1 FROM clara_journal_entries WHERE id=m->>'id') THEN RAISE EXCEPTION 'NATIVE_JOURNAL_CONFLICT' USING ERRCODE='23505'; END IF;
   INSERT INTO clara_journal_entries(id,entry,created_at) VALUES(m->>'id',m,(m->>'createdAt')::timestamptz);
   INSERT INTO clara_native_journal_scope VALUES(m->>'id',s,actor,w,c,p);
  END LOOP;
  UPDATE clara_sessions SET data=payload->'session',updated_at=NOW() WHERE id=s;
  UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='session' AND resource_id=s AND revoked_at IS NULL;
  INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
  VALUES('session',s,actor,w,c,p,encode(sha256(convert_to((payload->'session')::text,'UTF8')),'hex'),actor,'Owned native session version committed through scoped runtime');
  ns:=payload->'session';
 END IF;
 RETURN jsonb_build_object('protocolVersion',2,'userId',actor,'canWrite',((ns#>>'{mission,id}' IS NULL AND jsonb_array_length(COALESCE(ns->'conversation','[]'::jsonb))=0 AND COALESCE(ns->'brainDashboard','null'::jsonb)='null'::jsonb AND COALESCE(ns->'recommendation','null'::jsonb)='null'::jsonb AND jsonb_array_length(COALESCE(ns->'sources','[]'::jsonb))=0 AND jsonb_array_length(COALESCE(ns->'documentReferences','[]'::jsonb))=0) OR COALESCE(ns->>'nativeMissionId'=ns#>>'{mission,id}',false)) AND EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL),'session',ns,
 'acquisitions',(SELECT COALESCE(jsonb_agg(clara_native_acquisition_snapshot(w,a.submission_id)),'[]'::jsonb) FROM clara_acquisition_records a JOIN clara_native_resource_authority b ON b.resource_kind='acquisition' AND b.resource_id=w||'/'||a.submission_id AND b.revoked_at IS NULL WHERE a.workspace_id=w AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.snapshot_sha256=encode(sha256(convert_to(clara_native_acquisition_snapshot(w,a.submission_id)::text,'UTF8')),'hex')),
 'missions',(SELECT COALESCE(jsonb_agg(mm.data),'[]'::jsonb) FROM clara_missions mm JOIN clara_native_resource_authority b ON b.resource_kind='mission' AND b.resource_id=mm.id AND b.revoked_at IS NULL
 WHERE b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.snapshot_sha256=encode(sha256(convert_to(mm.data::text,'UTF8')),'hex')),
 'journal',(SELECT COALESCE(jsonb_agg(j.entry ORDER BY j.created_at),'[]'::jsonb) FROM clara_journal_entries j JOIN clara_native_journal_scope js ON js.entry_id=j.id
 WHERE js.owner_user_id=actor AND js.workspace_id=w AND js.client_id=c AND js.project_id=p AND js.session_id=s));
END $$;
REVOKE ALL ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
-- Reuse the existing operation ledger, isolated from inbound cognitive jobs.
CREATE OR REPLACE FUNCTION clara_native_chat_command(d TEXT,w TEXT,c TEXT,p TEXT,s TEXT,op TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE snapshot JSONB; actor TEXT; jid TEXT; fingerprint_ TEXT; scope_ TEXT; job clara_external_event_jobs%ROWTYPE; other clara_external_event_jobs%ROWTYPE; owner UUID;
BEGIN
 -- Same canonical/workspace-first authority and lock order, including replay.
 snapshot:=clara_native_runtime_command(d,w,c,p,s,'write','{}'::jsonb);actor:=snapshot->>'userId';
 IF op='reserve' THEN
  IF payload->>'operationId' !~ '^[A-Za-z0-9_-]{16,80}$' OR payload->>'operationId' IS NULL
   OR COALESCE(length(payload->>'message'),0) NOT BETWEEN 1 AND 16000 THEN
   RAISE EXCEPTION 'INVALID_CHAT_OPERATION' USING ERRCODE='22023'; END IF;
  jid:=encode(sha256(convert_to(jsonb_build_array('native-chat',actor,payload->>'operationId')::text,'UTF8')),'hex');
  scope_:='native-chat:'||s;
  fingerprint_:=encode(sha256(convert_to(jsonb_build_array(actor,w,c,p,s,payload->>'message')::text,'UTF8')),'hex');
  SELECT * INTO job FROM clara_external_event_jobs WHERE job_id=jid FOR UPDATE;
  IF FOUND THEN
   IF job.job_kind<>'native-chat' OR job.fingerprint<>fingerprint_ THEN RAISE EXCEPTION 'CHAT_OPERATION_CONFLICT' USING ERRCODE='23505'; END IF;
   IF job.status='completed' THEN RETURN jsonb_build_object('state','completed','result',job.result); END IF;
   RETURN jsonb_build_object('state','pending');
  END IF;
  SELECT * INTO other FROM clara_external_event_jobs WHERE job_kind='native-chat' AND scope_key=scope_ AND status IN ('processing','uncertain') FOR UPDATE;
  IF FOUND THEN RETURN jsonb_build_object('state','busy','request',other.request-'locale'); END IF;
  owner:=gen_random_uuid();
  INSERT INTO clara_external_event_jobs(job_id,scope_key,product_id,os_workspace_id,fingerprint,request,correlation_id,status,phase,owner_token,started_at,job_kind)
  VALUES(jid,scope_,'clara-os',w,fingerprint_,payload,replace(gen_random_uuid()::text,'-',''),'processing','native-chat',owner,clock_timestamp(),'native-chat');
  RETURN jsonb_build_object('state','owned','jobId',jid,'ownerToken',owner);
 END IF;
 IF op='cancel' THEN
  IF payload->'confirm' IS DISTINCT FROM 'true'::jsonb OR payload->>'operationId' !~ '^[A-Za-z0-9_-]{16,80}$' THEN
   RAISE EXCEPTION 'EXPLICIT_CHAT_CANCELLATION_REQUIRED' USING ERRCODE='22023'; END IF;
  jid:=encode(sha256(convert_to(jsonb_build_array('native-chat',actor,payload->>'operationId')::text,'UTF8')),'hex');
  SELECT * INTO job FROM clara_external_event_jobs WHERE job_id=jid AND job_kind='native-chat' AND scope_key='native-chat:'||s FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_OWNER_UNAVAILABLE' USING ERRCODE='42501'; END IF;
  IF job.status='completed' THEN RETURN jsonb_build_object('state','completed','result',job.result); END IF;
  UPDATE clara_external_event_jobs SET status='completed',phase='native-cancelled',updated_at=clock_timestamp(),
   result=jsonb_build_object('status',409,'body',jsonb_build_object('success',false,'code','NATIVE_CHAT_CANCELLED')) WHERE job_id=jid RETURNING * INTO job;
  RETURN jsonb_build_object('state','completed','result',job.result);
 END IF;
 IF op NOT IN ('finish','abort') THEN RAISE EXCEPTION 'INVALID_CHAT_COMMAND' USING ERRCODE='22023'; END IF;
 SELECT * INTO job FROM clara_external_event_jobs WHERE job_id=payload->>'jobId' AND job_kind='native-chat'
  AND scope_key='native-chat:'||s AND owner_token=(payload->>'ownerToken')::uuid AND status='processing' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CHAT_OWNER_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 IF op='finish' AND payload->'commit' IS NOT NULL AND payload->'commit'<>'null'::jsonb THEN
  PERFORM clara_native_runtime_command(d,w,c,p,s,'commit',payload->'commit');
 END IF;
 IF jsonb_typeof(payload->'result') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'INVALID_CHAT_RESULT' USING ERRCODE='22023'; END IF;
 payload:=jsonb_set(payload,'{result,journalEntryIds}',COALESCE((SELECT jsonb_agg(entry->'id') FROM jsonb_array_elements(COALESCE(payload#>'{commit,journal}','[]'::jsonb)) entry),'[]'::jsonb));
 UPDATE clara_external_event_jobs SET status='completed',result=payload->'result',phase='native-receipt',updated_at=clock_timestamp() WHERE job_id=job.job_id;
 RETURN jsonb_build_object('state','completed');
END $$;
REVOKE ALL ON FUNCTION clara_native_chat_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
