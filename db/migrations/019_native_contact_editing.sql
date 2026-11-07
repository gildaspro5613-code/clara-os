-- Extend the existing runtime commit and acquisition store only. No historical attribution.
-- Requires 017; independent of the 018 mailbox function. Reapplicable.
BEGIN;
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
  RETURN jsonb_build_object('contactProtocolVersion',1,'protocolVersion',2,'canWrite',EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL),'sessions',(SELECT COALESCE(jsonb_agg(jsonb_build_object('sessionId',ns.id,'updatedAt',ns.updated_at) ORDER BY ns.updated_at DESC),'[]'::jsonb)
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
  IF payload->'contactWrite' IS NOT NULL AND payload->'contactWrite'<>'null'::jsonb THEN
   acquisition:=payload->'contactWrite';mid:=acquisition->>'submissionId';
   IF COALESCE(length(acquisition->>'name'),0) NOT BETWEEN 1 AND 160 OR COALESCE(length(acquisition->>'email'),0) NOT BETWEEN 3 AND 254
    OR acquisition->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'CONTACT_INVALID' USING ERRCODE='22023'; END IF;
   IF acquisition->>'action'='create' THEN
    IF mid NOT LIKE 'native-contact:%' OR acquisition#>>'{intake,submissionId}' IS DISTINCT FROM mid
     OR acquisition#>>'{intake,contact,name}' IS DISTINCT FROM acquisition->>'name' OR acquisition#>>'{intake,contact,email}' IS DISTINCT FROM acquisition->>'email'
     OR acquisition#>>'{intake,source,channel}' IS DISTINCT FROM 'contact-reviewed' THEN RAISE EXCEPTION 'CONTACT_INVALID' USING ERRCODE='22023'; END IF;
    INSERT INTO clara_project_intake_inbox(workspace_id,submission_id,product_id,session_key,event_id,intake) VALUES(w,mid,'clara-os',s,acquisition->>'eventId',acquisition->'intake');
    INSERT INTO clara_acquisition_records(workspace_id,submission_id,qualification,decision_brief,lifecycle) VALUES(w,mid,acquisition->'qualification',acquisition->'decisionBrief',acquisition->'lifecycle');
   ELSIF acquisition->>'action'='update' THEN
    PERFORM 1 FROM clara_native_resource_authority b WHERE b.resource_kind='acquisition' AND b.resource_id=w||'/'||mid
     AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.revoked_at IS NULL
     AND b.snapshot_sha256=encode(sha256(convert_to(clara_native_acquisition_snapshot(w,mid)::text,'UTF8')),'hex') FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'NATIVE_ACQUISITION_DENIED' USING ERRCODE='42501'; END IF;
    IF payload->'expectedAcquisitions'->mid IS DISTINCT FROM clara_native_acquisition_snapshot(w,mid) THEN RAISE EXCEPTION 'CONTACT_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
    -- Never silently retarget an already prepared communication or discard it.
    IF EXISTS(SELECT 1 FROM clara_acquisition_records WHERE workspace_id=w AND submission_id=mid AND commercial_draft IS NOT NULL) OR EXISTS(SELECT 1 FROM clara_missions WHERE data->>'acquisitionSubmissionId'=mid AND COALESCE(data->'emailDraft','null'::jsonb)<>'null'::jsonb)
     THEN RAISE EXCEPTION 'CONTACT_DRAFT_REVIEW_REQUIRED' USING ERRCODE='40001'; END IF;
    UPDATE clara_project_intake_inbox SET intake=jsonb_set(jsonb_set(intake,'{contact,name}',to_jsonb(acquisition->>'name')),'{contact,email}',to_jsonb(acquisition->>'email')),updated_at=clock_timestamp() WHERE workspace_id=w AND submission_id=mid;
    UPDATE clara_acquisition_records SET updated_at=clock_timestamp() WHERE workspace_id=w AND submission_id=mid;
    UPDATE clara_native_resource_authority SET revoked_at=clock_timestamp() WHERE resource_kind='acquisition' AND resource_id=w||'/'||mid AND revoked_at IS NULL;
   ELSE RAISE EXCEPTION 'CONTACT_INVALID' USING ERRCODE='22023'; END IF;
   INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
    VALUES('acquisition',w||'/'||mid,actor,w,c,p,encode(sha256(convert_to(clara_native_acquisition_snapshot(w,mid)::text,'UTF8')),'hex'),actor,'Contact explicitly reviewed in native scope; original request and mission links preserved');
  END IF;
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
 RETURN jsonb_build_object('contactProtocolVersion',1,'protocolVersion',2,'userId',actor,'canWrite',((ns#>>'{mission,id}' IS NULL AND jsonb_array_length(COALESCE(ns->'conversation','[]'::jsonb))=0 AND COALESCE(ns->'brainDashboard','null'::jsonb)='null'::jsonb AND COALESCE(ns->'recommendation','null'::jsonb)='null'::jsonb AND jsonb_array_length(COALESCE(ns->'sources','[]'::jsonb))=0 AND jsonb_array_length(COALESCE(ns->'documentReferences','[]'::jsonb))=0) OR COALESCE(ns->>'nativeMissionId'=ns#>>'{mission,id}',false)) AND EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL),'session',ns,
 'acquisitions',(SELECT COALESCE(jsonb_agg(clara_native_acquisition_snapshot(w,a.submission_id)),'[]'::jsonb) FROM clara_acquisition_records a JOIN clara_native_resource_authority b ON b.resource_kind='acquisition' AND b.resource_id=w||'/'||a.submission_id AND b.revoked_at IS NULL WHERE a.workspace_id=w AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.snapshot_sha256=encode(sha256(convert_to(clara_native_acquisition_snapshot(w,a.submission_id)::text,'UTF8')),'hex')),
 'missions',(SELECT COALESCE(jsonb_agg(mm.data),'[]'::jsonb) FROM clara_missions mm JOIN clara_native_resource_authority b ON b.resource_kind='mission' AND b.resource_id=mm.id AND b.revoked_at IS NULL
 WHERE b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.snapshot_sha256=encode(sha256(convert_to(mm.data::text,'UTF8')),'hex')),
 'journal',(SELECT COALESCE(jsonb_agg(j.entry ORDER BY j.created_at),'[]'::jsonb) FROM clara_journal_entries j JOIN clara_native_journal_scope js ON js.entry_id=j.id
 WHERE js.owner_user_id=actor AND js.workspace_id=w AND js.client_id=c AND js.project_id=p AND js.session_id=s));
END $$;
REVOKE ALL ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
