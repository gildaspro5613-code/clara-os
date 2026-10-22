-- Additive. Uses the existing job ledger and native authority; no historical backfill.
BEGIN;
ALTER TABLE clara_external_event_jobs DROP CONSTRAINT IF EXISTS clara_external_event_jobs_job_kind_check;
ALTER TABLE clara_external_event_jobs ADD CONSTRAINT clara_external_event_jobs_job_kind_check
 CHECK(job_kind IN ('external-event','native-chat','native-document'));
DO $$ BEGIN
 IF to_regprocedure('clara_native_runtime_command_pre_document(text,text,text,text,text,text,jsonb)') IS NULL THEN
  ALTER FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) RENAME TO clara_native_runtime_command_pre_document;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION clara_native_runtime_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE proof JSONB; result_ JSONB;
BEGIN
 IF operation='commit' THEN
  -- Workspace-first lock order. Revocation and commit serialize on this lock.
  PERFORM clara_native_runtime_command_pre_document(digest,w,c,p,s,'write','{}'::jsonb);
  FOR proof IN SELECT value FROM jsonb_array_elements(COALESCE(payload->'documentProofs','[]'::jsonb)) LOOP
   PERFORM clara_native_google_command(digest,w,c,p,s,'document',proof);
  END LOOP;
 END IF;
 result_:=clara_native_runtime_command_pre_document(digest,w,c,p,s,operation,payload);
 IF operation IN ('read','write') THEN result_:=result_||jsonb_build_object('documentProtocolVersion',1);END IF;
 RETURN result_;
END $$;
REVOKE ALL ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
CREATE OR REPLACE FUNCTION clara_native_document_command(d TEXT,w TEXT,c TEXT,p TEXT,s TEXT,op TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE view_ JSONB; actor TEXT; jid TEXT; fp TEXT; job clara_external_event_jobs%ROWTYPE; owner UUID;
BEGIN
 view_:=clara_native_runtime_command(d,w,c,p,s,'write','{}'::jsonb);actor:=view_->>'userId';
 PERFORM clara_native_google_command(d,w,c,p,s,'document',payload->'proof');
 IF op='reserve' THEN
  IF payload->>'operationId' IS NULL OR payload->>'operationId' !~ '^[A-Za-z0-9_-]{16,80}$'
   OR payload#>>'{request,missionId}' IS DISTINCT FROM view_#>>'{session,mission,id}' THEN
   RAISE EXCEPTION 'INVALID_DOCUMENT_OPERATION' USING ERRCODE='22023';
  END IF;
  jid:=encode(sha256(convert_to(jsonb_build_array('native-document',actor,payload->>'operationId')::text,'UTF8')),'hex');
  fp:=encode(sha256(convert_to(jsonb_build_array(actor,w,c,p,s,payload->'request')::text,'UTF8')),'hex');
  SELECT * INTO job FROM clara_external_event_jobs WHERE job_id=jid FOR UPDATE;
  IF FOUND THEN
   IF job.job_kind<>'native-document' OR job.fingerprint<>fp THEN RAISE EXCEPTION 'DOCUMENT_OPERATION_CONFLICT' USING ERRCODE='23505'; END IF;
   RETURN jsonb_build_object('state',CASE WHEN job.status='completed' THEN 'completed' ELSE 'pending' END,'result',job.result);
  END IF;
  -- Do not steal an interrupted invocation, even after process restart.
  IF EXISTS(SELECT 1 FROM clara_external_event_jobs WHERE scope_key='native-document:'||s AND status IN ('processing','uncertain')) THEN
   RETURN jsonb_build_object('state','pending');
  END IF;
  owner:=gen_random_uuid();
  INSERT INTO clara_external_event_jobs(job_id,scope_key,product_id,os_workspace_id,fingerprint,request,correlation_id,status,phase,owner_token,started_at,job_kind)
  VALUES(jid,'native-document:'||s,'clara-os',w,fp,payload->'request',replace(gen_random_uuid()::text,'-',''),'processing','native-document',owner,clock_timestamp(),'native-document');
  RETURN jsonb_build_object('state','owned','jobId',jid,'ownerToken',owner);
 END IF;
 IF op NOT IN ('finish','abort') THEN RAISE EXCEPTION 'INVALID_DOCUMENT_COMMAND' USING ERRCODE='22023'; END IF;
 SELECT * INTO job FROM clara_external_event_jobs WHERE job_id=payload->>'jobId' AND job_kind='native-document'
  AND scope_key='native-document:'||s AND status='processing' AND owner_token=(payload->>'ownerToken')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_OWNER_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 IF op='abort' THEN
  IF payload#>>'{proof,bindingId}' IS DISTINCT FROM job.request->>'bindingId' OR payload#>'{result,error}' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(payload#>'{result,encryptedReceipt}') IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'INVALID_DOCUMENT_FAILURE_RECEIPT' USING ERRCODE='42501';
  END IF;
  UPDATE clara_external_event_jobs SET status='completed',phase='native-document-failed',result=payload->'result',updated_at=clock_timestamp() WHERE job_id=job.job_id;
  RETURN jsonb_build_object('state','completed');
 END IF;
 IF payload#>>'{commit,session,mission,id}' IS DISTINCT FROM job.request->>'missionId'
  OR payload#>>'{proof,bindingId}' IS DISTINCT FROM job.request->>'bindingId'
  OR jsonb_typeof(payload->'result') IS DISTINCT FROM 'object' OR jsonb_typeof(payload#>'{result,encryptedReceipt}') IS DISTINCT FROM 'string' THEN
  RAISE EXCEPTION 'INVALID_DOCUMENT_COMMIT' USING ERRCODE='42501';
 END IF;
 PERFORM clara_native_runtime_command(d,w,c,p,s,'commit',payload->'commit');
 UPDATE clara_external_event_jobs SET status='completed',phase='native-document-receipt',result=payload->'result',updated_at=clock_timestamp() WHERE job_id=job.job_id;
 RETURN jsonb_build_object('state','completed');
END $$;
REVOKE ALL ON FUNCTION clara_native_document_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
-- Preserve the existing explicit runtime EXECUTE ACL. No PUBLIC grants or DDL role.
DO $$ DECLARE r RECORD; BEGIN
 FOR r IN SELECT DISTINCT a.grantee,pg_get_userbyid(a.grantee) role_name FROM pg_proc p,
 LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
 WHERE p.oid='clara_native_runtime_command_pre_document(text,text,text,text,text,text,jsonb)'::regprocedure
 AND a.privilege_type='EXECUTE' AND a.grantee<>0 LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO %I',r.role_name);
  IF has_function_privilege(r.grantee,'clara_native_google_command(text,text,text,text,text,text,jsonb)','EXECUTE') THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION clara_native_document_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO %I',r.role_name);
  END IF;
 END LOOP;
END $$;
COMMIT;
