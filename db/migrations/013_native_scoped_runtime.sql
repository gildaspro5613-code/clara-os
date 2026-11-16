-- Additive native runtime metadata. No historical assignment; staging only.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_journal_entries(id TEXT PRIMARY KEY,entry JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS clara_native_journal_scope(
 entry_id TEXT PRIMARY KEY REFERENCES clara_journal_entries(id),
 session_id TEXT NOT NULL, owner_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
 workspace_id TEXT NOT NULL, client_id TEXT NOT NULL, project_id TEXT NOT NULL,
 FOREIGN KEY(workspace_id,project_id,client_id) REFERENCES clara_registry_projects(workspace_id,id,client_id)
);
CREATE OR REPLACE FUNCTION clara_native_runtime_command(digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE actor TEXT; ns JSONB; sid TEXT; row RECORD; mid TEXT; m JSONB; bound RECORD;
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
 IF operation NOT IN ('read','list','document','write','create','commit') THEN RAISE EXCEPTION 'INVALID_NATIVE_COMMAND' USING ERRCODE='22023'; END IF;
 IF operation NOT IN ('read','list','document') AND NOT EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id
 WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_WRITE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='list' THEN
  RETURN jsonb_build_object('canWrite',EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL),'sessions',(SELECT COALESCE(jsonb_agg(jsonb_build_object('sessionId',ns.id,'updatedAt',ns.updated_at) ORDER BY ns.updated_at DESC),'[]'::jsonb)
  FROM clara_sessions ns JOIN clara_native_resource_authority b ON b.resource_kind='session' AND b.resource_id=ns.id AND b.revoked_at IS NULL
  WHERE b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND clara_native_read_session(digest,w,c,p,ns.id) IS NOT NULL));
 END IF;
 IF operation='create' THEN
  sid:='native:'||gen_random_uuid()::text;
  ns:=jsonb_build_object('state','STARTING','recommendation',NULL,'brainDashboard',NULL,'mission',NULL,'sources','[]'::jsonb,'user',jsonb_build_object('firstName',NULL),'conversation','[]'::jsonb,'startedAt',clock_timestamp(),'updatedAt',clock_timestamp());
  INSERT INTO clara_sessions(id,data) VALUES(sid,ns);
  INSERT INTO clara_native_resource_authority(resource_kind,resource_id,owner_user_id,workspace_id,client_id,project_id,snapshot_sha256,reviewed_by,review_reason)
  VALUES('session',sid,actor,w,c,p,encode(sha256(convert_to(ns::text,'UTF8')),'hex'),actor,'New native session created in explicit canonical scope');
  RETURN jsonb_build_object('sessionId',sid);
 END IF;
 ns:=clara_native_read_session(digest,w,c,p,s);
 IF ns IS NULL THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='document' THEN
  IF NOT EXISTS(SELECT 1 FROM clara_native_resource_authority b WHERE b.resource_kind='document' AND b.resource_id=payload->>'fileId' AND b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.revoked_at IS NULL) THEN RAISE EXCEPTION 'NATIVE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
  -- Canonical ownership is not a proof of the connected Google principal's
  -- current Drive rights or of the content revision. Never unlock content here.
  RETURN jsonb_build_object('osBindingVerified',true,'driveRightsVerified',false,'contentRevisionVerified',false,'readAllowed',false);
 END IF;
 IF operation='commit' THEN
  IF ns IS DISTINCT FROM payload->'expected' THEN RAISE EXCEPTION 'NATIVE_REVISION_CONFLICT' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(payload->'session')<>'object' OR jsonb_typeof(payload->'missions')<>'array' OR jsonb_typeof(payload->'journal')<>'array' THEN RAISE EXCEPTION 'INVALID_NATIVE_COMMIT' USING ERRCODE='22023'; END IF;
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
 RETURN jsonb_build_object('userId',actor,'canWrite',EXISTS(SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id WHERE ca.workspace_id=w AND ca.client_id=c AND pa.project_id=p AND ca.user_id=actor AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL),'session',ns,
 'missions',(SELECT COALESCE(jsonb_agg(mm.data),'[]'::jsonb) FROM clara_missions mm JOIN clara_native_resource_authority b ON b.resource_kind='mission' AND b.resource_id=mm.id AND b.revoked_at IS NULL
 WHERE b.owner_user_id=actor AND b.workspace_id=w AND b.client_id=c AND b.project_id=p AND b.snapshot_sha256=encode(sha256(convert_to(mm.data::text,'UTF8')),'hex')),
 'journal',(SELECT COALESCE(jsonb_agg(j.entry ORDER BY j.created_at),'[]'::jsonb) FROM clara_journal_entries j JOIN clara_native_journal_scope js ON js.entry_id=j.id
 WHERE js.owner_user_id=actor AND js.workspace_id=w AND js.client_id=c AND js.project_id=p AND js.session_id=s));
END $$;
REVOKE ALL ON clara_native_journal_scope FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_native_runtime_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
