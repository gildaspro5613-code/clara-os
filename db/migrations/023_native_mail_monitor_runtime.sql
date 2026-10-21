-- Additive service runtime for 022. No role, secret, grant or schedule is activated.
BEGIN;
ALTER TABLE clara_native_mail_monitor_grants
 ADD COLUMN IF NOT EXISTS service_role NAME,
 ADD COLUMN IF NOT EXISTS lease_token UUID,
 ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS next_poll_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
 ADD COLUMN IF NOT EXISTS last_commit_token UUID,
 ADD COLUMN IF NOT EXISTS last_failure_code TEXT;

CREATE OR REPLACE FUNCTION clara_native_mail_monitor_generation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NEW.connection_id<>OLD.connection_id OR NEW.workspace_id<>OLD.workspace_id OR NEW.granted_by<>OLD.granted_by THEN
  RAISE EXCEPTION 'MAIL_MONITOR_SCOPE_IMMUTABLE' USING ERRCODE='42501';
 END IF;
 IF ROW(NEW.enabled,NEW.revoked_at,NEW.service_role,NEW.reviewed_by,NEW.review_reason)
  IS DISTINCT FROM ROW(OLD.enabled,OLD.revoked_at,OLD.service_role,OLD.reviewed_by,OLD.review_reason) THEN
  NEW.generation:=OLD.generation+1; NEW.lease_token:=NULL; NEW.lease_until:=NULL;
  NEW.next_poll_at:=clock_timestamp();
 ELSIF NEW.generation<>OLD.generation THEN
  RAISE EXCEPTION 'MAIL_MONITOR_GENERATION_IMMUTABLE' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS clara_native_mail_monitor_generation ON clara_native_mail_monitor_grants;
CREATE TRIGGER clara_native_mail_monitor_generation BEFORE UPDATE ON clara_native_mail_monitor_grants
 FOR EACH ROW EXECUTE FUNCTION clara_native_mail_monitor_generation();

-- Narrow service API: the actual PostgreSQL LOGIN identity, never an HTTP actor,
-- must be explicitly assigned on 022. EXECUTE must be separately reviewed/granted.
-- Fixed search_path protects this SECURITY DEFINER function against temp objects.
CREATE OR REPLACE FUNCTION clara_native_mail_monitor_command(operation TEXT,payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE g public.clara_native_mail_monitor_grants; a public.clara_native_mail_authority;
 r public.clara_native_mail_sync; item JSONB; lease UUID; expected_uid BIGINT;
 message_uid BIGINT; message_id TEXT; n INTEGER; incoming INTEGER; last_uid BIGINT;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=session_user AND rolcanlogin
  AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication)
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles principal_role ON principal_role.oid=m.member WHERE principal_role.rolname=session_user)
 OR has_schema_privilege(session_user,'public','CREATE')
 OR pg_has_role(session_user,(SELECT datdba FROM pg_catalog.pg_database WHERE datname=current_database()),'MEMBER')
 THEN RAISE EXCEPTION 'MAIL_MONITOR_SERVICE_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='list' THEN
  RETURN jsonb_build_object('connections',COALESCE((SELECT jsonb_agg(x) FROM (
   SELECT connection_id,workspace_id FROM public.clara_native_mail_monitor_grants
   WHERE service_role=session_user AND enabled AND revoked_at IS NULL
    AND next_poll_at<=clock_timestamp() AND (lease_until IS NULL OR lease_until<=clock_timestamp())
   ORDER BY next_poll_at,connection_id LIMIT 5)x),'[]'::jsonb));
 END IF;
 IF operation NOT IN ('claim','check','commit','fail','status') THEN
  RAISE EXCEPTION 'MAIL_MONITOR_OPERATION_DENIED' USING ERRCODE='42501';
 END IF;
 SELECT * INTO g FROM public.clara_native_mail_monitor_grants
  WHERE connection_id=payload->>'connectionId' AND workspace_id=payload->>'workspaceId'
  AND service_role=session_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MAIL_MONITOR_SCOPE_DENIED' USING ERRCODE='42501'; END IF;
 -- Reuse 022; never substitute CRON_SECRET or a user session for this check.
 PERFORM public.clara_native_mail_monitor_authority(g.connection_id,g.workspace_id);
 SELECT * INTO a FROM public.clara_native_mail_authority WHERE connection_id=g.connection_id FOR UPDATE;
 -- Serialize with validated revocation of the connection, owner membership/identity.
 PERFORM 1 FROM public.clara_connections WHERE id=a.connection_id AND workspace_id=g.workspace_id
  AND provider='ionos' AND status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MAIL_MONITOR_DENIED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.clara_workspace_memberships WHERE workspace_id=g.workspace_id
  AND user_id=a.owner_user_id AND revoked_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MAIL_MONITOR_DENIED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.clara_auth_identities WHERE user_id=a.owner_user_id FOR SHARE;
 IF NOT FOUND OR g.granted_by<>a.owner_user_id THEN
  RAISE EXCEPTION 'MAIL_MONITOR_OWNER_DENIED' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.clara_workspace_memberships WHERE workspace_id=g.workspace_id
  AND user_id=g.reviewed_by AND revoked_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'MAIL_MONITOR_REVIEW_DENIED' USING ERRCODE='42501'; END IF;
 IF operation='status' THEN
  RETURN jsonb_build_object('lastCommitToken',g.last_commit_token,'lastSuccessAt',g.last_success_at,
   'lastFailureCode',g.last_failure_code,'nextPollAt',g.next_poll_at);
 END IF;
 SELECT * INTO r FROM public.clara_native_mail_sync WHERE connection_id=g.connection_id AND folder='INBOX' FOR UPDATE;
 IF operation='claim' THEN
  IF g.next_poll_at>clock_timestamp() OR g.lease_until>clock_timestamp() THEN RETURN jsonb_build_object('claimed',false); END IF;
  lease:=gen_random_uuid();
  UPDATE public.clara_native_mail_monitor_grants SET lease_token=lease,
   lease_until=clock_timestamp()+INTERVAL '2 minutes',next_poll_at=clock_timestamp()+INTERVAL '5 minutes',
   last_attempt_at=clock_timestamp() WHERE connection_id=g.connection_id;
  RETURN jsonb_build_object('claimed',true,'connectionId',g.connection_id,'workspaceId',g.workspace_id,
   'generation',g.generation,'authorityRevision',a.revision,'leaseToken',lease,
   'cursorRevision',COALESCE(r.revision,0),'cursor',COALESCE(to_jsonb(r),'{}'),
   'address',a.address,'encryptedPayload',(SELECT encrypted_payload FROM public.clara_connection_credentials WHERE connection_id=g.connection_id));
 END IF;
 IF g.lease_token IS NULL OR g.lease_until<=clock_timestamp()
  OR g.lease_token::text IS DISTINCT FROM payload->>'leaseToken'
  OR g.generation::text IS DISTINCT FROM payload->>'generation'
  OR a.revision::text IS DISTINCT FROM payload->>'authorityRevision' THEN
  RAISE EXCEPTION 'MAIL_MONITOR_FENCE_CHANGED' USING ERRCODE='40001'; END IF;
 IF operation='check' THEN RETURN jsonb_build_object('authorized',true); END IF;
 IF operation='fail' THEN
  UPDATE public.clara_native_mail_monitor_grants SET lease_token=NULL,lease_until=NULL,
   last_failure_code='MAIL_MONITOR_READ_FAILED' WHERE connection_id=g.connection_id;
  RETURN jsonb_build_object('recorded',true);
 END IF;
 IF COALESCE(r.revision,0)::text IS DISTINCT FROM payload->>'cursorRevision' THEN
  RAISE EXCEPTION 'MAIL_MONITOR_CURSOR_CHANGED' USING ERRCODE='40001'; END IF;
 IF jsonb_typeof(payload->'messages') IS DISTINCT FROM 'array' OR jsonb_typeof(payload->'uids') IS DISTINCT FROM 'array'
  OR jsonb_array_length(payload->'messages')>25 OR jsonb_array_length(payload->'uids')>5000
  OR COALESCE(payload->>'uidValidity','') !~ '^[0-9]{1,20}$' THEN
  RAISE EXCEPTION 'MAIL_MONITOR_BATCH_DENIED' USING ERRCODE='22023'; END IF;
 last_uid:=(payload->>'lastUid')::bigint;
 expected_uid:=CASE WHEN r.uid_validity=payload->>'uidValidity' THEN r.last_uid ELSE 0 END;
 IF last_uid IS NULL OR last_uid<expected_uid OR last_uid>4294967295 THEN
  RAISE EXCEPTION 'MAIL_MONITOR_UID_DENIED' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(payload->'uids') u WHERE u::bigint NOT BETWEEN 1 AND 4294967295)
 OR (SELECT count(*) FROM jsonb_array_elements_text(payload->'uids'))<>(SELECT count(DISTINCT u) FROM jsonb_array_elements_text(payload->'uids') u)
 OR (SELECT count(*) FROM jsonb_array_elements_text(payload->'uids') u WHERE u::bigint>expected_uid AND u::bigint<=last_uid)<>jsonb_array_length(payload->'messages') THEN
  RAISE EXCEPTION 'MAIL_MONITOR_INCOMPLETE_BATCH' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT m->>'uid') FROM jsonb_array_elements(payload->'messages') m)<>jsonb_array_length(payload->'messages') THEN
  RAISE EXCEPTION 'MAIL_MONITOR_DUPLICATE_UID' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO incoming FROM jsonb_array_elements(payload->'messages') m
  WHERE NOT EXISTS(SELECT 1 FROM public.clara_native_mail_messages mm WHERE mm.connection_id=g.connection_id
   AND mm.folder='INBOX' AND mm.uid_validity=payload->>'uidValidity' AND mm.uid=(m->>'uid')::bigint);
 SELECT count(*) INTO n FROM public.clara_native_mail_messages WHERE connection_id=g.connection_id;
 IF n+incoming>500 THEN RAISE EXCEPTION 'MAIL_RETENTION_LIMIT_REVIEW_REQUIRED' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'messages') LOOP
  message_uid:=(item->>'uid')::bigint;
  message_id:=encode(sha256(convert_to(g.connection_id,'UTF8')||decode('00','hex')||convert_to('INBOX','UTF8')||decode('00','hex')||convert_to(payload->>'uidValidity','UTF8')||decode('00','hex')||convert_to(message_uid::text,'UTF8')),'hex');
  IF message_uid<=expected_uid OR message_uid>last_uid OR NOT (payload->'uids' @> to_jsonb(message_uid))
   OR item->>'id' IS DISTINCT FROM message_id OR COALESCE(length(item->>'encryptedPayload'),0) NOT BETWEEN 1 AND 1500000 THEN
   RAISE EXCEPTION 'MAIL_MONITOR_MESSAGE_DENIED' USING ERRCODE='22023'; END IF;
 END LOOP;
 UPDATE public.clara_native_mail_messages SET available=false WHERE connection_id=g.connection_id AND folder='INBOX'
  AND (uid_validity<>payload->>'uidValidity' OR NOT (payload->'uids' @> to_jsonb(uid)));
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'messages') LOOP
  INSERT INTO public.clara_native_mail_messages(id,connection_id,folder,uid_validity,uid,encrypted_payload)
   VALUES(item->>'id',g.connection_id,'INBOX',payload->>'uidValidity',(item->>'uid')::bigint,item->>'encryptedPayload')
  ON CONFLICT(connection_id,folder,uid_validity,uid) DO UPDATE SET available=true,updated_at=clock_timestamp();
 END LOOP;
 INSERT INTO public.clara_native_mail_sync(connection_id,folder,uid_validity,last_uid)
  VALUES(g.connection_id,'INBOX',payload->>'uidValidity',last_uid)
 ON CONFLICT(connection_id,folder) DO UPDATE SET uid_validity=EXCLUDED.uid_validity,last_uid=EXCLUDED.last_uid,revision=clara_native_mail_sync.revision+1;
 UPDATE public.clara_native_mail_monitor_grants SET lease_token=NULL,lease_until=NULL,
  last_success_at=clock_timestamp(),last_commit_token=g.lease_token,last_failure_code=NULL,
  next_poll_at=clock_timestamp()+INTERVAL '5 minutes' WHERE connection_id=g.connection_id;
 RETURN jsonb_build_object('committed',true,'count',jsonb_array_length(payload->'messages'));
END $$;
REVOKE ALL ON FUNCTION clara_native_mail_monitor_command(TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_native_mail_monitor_generation() FROM PUBLIC;
COMMIT;
