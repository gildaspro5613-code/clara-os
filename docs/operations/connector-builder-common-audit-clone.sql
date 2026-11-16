-- One universal READ audit entry point, ISOLATED CLONE ONLY.
-- Actor comes solely from the canonical authenticated Clara OS session.
-- The runtime role cannot INSERT directly into the audit table.
CREATE OR REPLACE FUNCTION clara_connector_builder.native_read_audit(
 digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,
 provider_ TEXT,capability_ TEXT,phase_ TEXT,
 connection_ TEXT,reason_ TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $builder_audit$
DECLARE
 actor TEXT;
BEGIN
 IF current_database()<>'neondb'
    OR session_user <> 'clara_make_runtime_login'
    OR w IS DISTINCT FROM 'melodie-digital'
    OR digest IS NULL OR digest !~ '^[a-f0-9]{64}$'
    OR provider_ IS NULL OR provider_ !~ '^[a-z][a-z0-9_-]{0,63}$'
    OR capability_ IS NULL OR capability_ !~ '^[a-z][a-z0-9._:-]{1,119}$'
    OR capability_ NOT LIKE provider_||'.%'
    OR phase_ NOT IN ('REQUESTED','DENIED','SUCCEEDED','FAILED')
    OR (connection_ IS NOT NULL AND length(connection_) NOT BETWEEN 1 AND 160)
    OR (reason_ IS NOT NULL AND length(reason_)>240)
 THEN
  RAISE EXCEPTION 'CONNECTOR_BUILDER_AUDIT_DENIED' USING ERRCODE='42501';
 END IF;
 actor:=public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId';
 IF actor IS NULL THEN
  RAISE EXCEPTION 'CONNECTOR_BUILDER_AUDIT_DENIED' USING ERRCODE='42501';
 END IF;

 -- Keep the log for exactly the eligible, reviewed capability.
 PERFORM 1 FROM clara_connector_builder.read_catalog cat
 WHERE cat.provider=provider_ AND cat.capability_id=capability_
   AND cat.effect='READ';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'CONNECTOR_BUILDER_AUDIT_DENIED' USING ERRCODE='42501';
 END IF;

 INSERT INTO clara_connector_builder.read_audit(
  workspace_id,client_id,project_id,actor_user_id,
  connection_id,provider,capability_id,phase,reason
 ) VALUES(w,c,p,actor,connection_,provider_,capability_,phase_,reason_);
END;
$builder_audit$;

REVOKE ALL ON FUNCTION clara_connector_builder.native_read_audit(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_connector_builder.native_read_audit(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
GRANT EXECUTE ON FUNCTION clara_connector_builder.native_read_audit(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
