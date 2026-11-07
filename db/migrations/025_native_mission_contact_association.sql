-- Additive extension of the existing native commit. No data backfill or new store.
-- Depends on 019 (runtime v2); apply AFTER all earlier migrations.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('clara_native_runtime_command_pre_mission_contact(text,text,text,text,text,text,jsonb)') IS NULL THEN
  ALTER FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) RENAME TO clara_native_runtime_command_pre_mission_contact;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION clara_native_runtime_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE view_ JSONB; prior JSONB; next_ JSONB; contact TEXT; mid TEXT; actor TEXT; binding RECORD; item JSONB; stored JSONB;
BEGIN
 IF operation='commit' THEN
  PERFORM 1 FROM clara_auth_workspaces WHERE id=w FOR UPDATE;
  FOR item IN SELECT value FROM jsonb_array_elements(COALESCE(payload->'missions','[]'::jsonb)) LOOP
   SELECT data INTO stored FROM clara_missions WHERE id=item->>'id';
   IF FOUND AND stored->>'acquisitionSubmissionId' IS DISTINCT FROM item->>'acquisitionSubmissionId' THEN
    IF stored->>'acquisitionSubmissionId' IS NOT NULL OR payload#>>'{missionContactWrite,missionId}' IS DISTINCT FROM item->>'id'
      OR payload#>>'{missionContactWrite,submissionId}' IS DISTINCT FROM item->>'acquisitionSubmissionId' THEN
     RAISE EXCEPTION 'NATIVE_MISSION_CONTACT_CONFLICT' USING ERRCODE='40001';
    END IF;
   END IF;
  END LOOP;
 END IF;
 IF operation='commit' AND payload->'missionContactWrite' IS NOT NULL THEN
  -- Use the existing workspace-first order and authority resolver, in the SAME
  -- transaction as the original Session/Mission/Journal commit below.
  PERFORM 1 FROM clara_auth_workspaces WHERE id=w FOR UPDATE;
  view_:=clara_native_runtime_command_pre_mission_contact(digest,w,c,p,s,'read','{}');
  actor:=view_->>'userId';mid:=payload#>>'{missionContactWrite,missionId}';contact:=payload#>>'{missionContactWrite,submissionId}';
  prior:=view_#>'{session,mission}';next_:=payload#>'{session,mission}';
  IF prior IS NULL OR prior='null'::jsonb OR mid IS DISTINCT FROM prior->>'id' OR contact IS NULL
   OR prior->>'acquisitionSubmissionId' IS NOT NULL
   OR next_ IS DISTINCT FROM prior||jsonb_build_object('acquisitionSubmissionId',contact)
   OR payload->'missions' IS DISTINCT FROM jsonb_build_array(next_)
   OR ((payload->'session')-'mission'-'updatedAt'-'acquisitionSubmissionId') IS DISTINCT FROM ((view_->'session')-'mission'-'updatedAt'-'acquisitionSubmissionId')
   OR view_#>>'{session,acquisitionSubmissionId}' IS NOT NULL THEN
   RAISE EXCEPTION 'NATIVE_MISSION_CONTACT_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF payload#>>'{session,acquisitionSubmissionId}' IS NOT NULL AND
    (payload#>>'{session,acquisitionSubmissionId}' IS DISTINCT FROM contact
     OR jsonb_array_length(COALESCE(view_#>'{session,conversation}','[]'::jsonb))>0
     OR EXISTS(SELECT 1 FROM clara_native_conversation_messages WHERE session_id=s)
     OR COALESCE(view_#>'{session,brainDashboard}','null'::jsonb)<>'null'::jsonb
     OR COALESCE(view_#>'{session,recommendation}','null'::jsonb)<>'null'::jsonb
     OR jsonb_array_length(COALESCE(view_#>'{session,sources}','[]'::jsonb))>0
     OR jsonb_array_length(COALESCE(view_#>'{session,documentReferences}','[]'::jsonb))>0) THEN
   RAISE EXCEPTION 'NATIVE_NEW_SESSION_REQUIRED' USING ERRCODE='40001';
  END IF;
  -- A business-only association must still revalidate the contact, even though
  -- the old conversation's acquisitionSubmissionId intentionally remains null.
  PERFORM 1 FROM clara_acquisition_records a JOIN clara_project_intake_inbox i ON i.workspace_id=a.workspace_id AND i.submission_id=a.submission_id
   WHERE a.workspace_id=w AND a.submission_id=contact FOR UPDATE OF a,i;
  SELECT * INTO binding FROM clara_native_resource_authority b WHERE b.resource_kind='acquisition' AND b.resource_id=w||'/'||contact
   AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.revoked_at IS NULL
   AND b.snapshot_sha256=encode(sha256(convert_to(clara_native_acquisition_snapshot(w,contact)::text,'UTF8')),'hex') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NATIVE_ACQUISITION_DENIED' USING ERRCODE='42501'; END IF;
  IF payload->'expectedAcquisitions'->contact IS DISTINCT FROM clara_native_acquisition_snapshot(w,contact) THEN
   RAISE EXCEPTION 'NATIVE_ACQUISITION_REVISION_CONFLICT' USING ERRCODE='40001';
  END IF;
 END IF;
 view_:=clara_native_runtime_command_pre_mission_contact(digest,w,c,p,s,operation,payload);
 RETURN view_||jsonb_build_object('missionContactProtocolVersion',1);
END $$;
REVOKE ALL ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_native_runtime_command_pre_mission_contact(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
-- Preserve existing explicit runtime EXECUTE grants on the new entrypoint.
-- Never enable PUBLIC or give the runtime DDL/owner rights.
DO $$ DECLARE a RECORD; role_name TEXT; BEGIN
 FOR a IN SELECT acl.grantee FROM pg_proc f CROSS JOIN LATERAL aclexplode(COALESCE(f.proacl,acldefault('f',f.proowner))) acl
  WHERE f.oid='clara_native_runtime_command(text,text,text,text,text,text,jsonb)'::regprocedure AND acl.grantee<>0 AND acl.grantee<>f.proowner LOOP
  SELECT rolname INTO role_name FROM pg_roles WHERE oid=a.grantee;
  EXECUTE format('REVOKE EXECUTE ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM %I',role_name);
 END LOOP;
 FOR a IN SELECT acl.grantee,acl.is_grantable FROM pg_proc f CROSS JOIN LATERAL aclexplode(COALESCE(f.proacl,acldefault('f',f.proowner))) acl
  WHERE f.oid='clara_native_runtime_command_pre_mission_contact(text,text,text,text,text,text,jsonb)'::regprocedure
   AND acl.privilege_type='EXECUTE' AND acl.grantee<>0 AND acl.grantee<>f.proowner LOOP
  SELECT rolname INTO role_name FROM pg_roles WHERE oid=a.grantee;
  EXECUTE format('GRANT EXECUTE ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO %I%s',role_name,CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
 END LOOP;
END $$;
COMMIT;
