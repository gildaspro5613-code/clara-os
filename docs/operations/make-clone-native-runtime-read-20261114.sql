-- CLONE ONLY. A SECURITY DEFINER gateway to the *existing* canonical
-- runtime read, never a second authentication system. No session creation,
-- no command parameter, no public RPC, no writes or fallback environments.
CREATE OR REPLACE FUNCTION clara_make_runtime_scope.native_runtime_read(
  digest TEXT, w TEXT, c TEXT, p TEXT, s TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $native_read$
DECLARE result_ JSONB;
BEGIN
  IF session_user <> 'clara_make_runtime_login'
     OR current_database() <> 'neondb'
     OR w IS DISTINCT FROM 'melodie-digital'
     OR digest IS NULL OR length(digest) <> 64 OR digest !~ '^[0-9a-f]{64}$'
     OR c IS NULL OR p IS NULL OR s IS NULL
  THEN
    RAISE EXCEPTION 'NATIVE_MAKE_SESSION_READ_DENIED' USING ERRCODE='42501';
  END IF;

  -- Authoritative session digest, workspace membership, client/project
  -- privileges and revocation are all checked by the existing native runtime.
  result_ := public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb);

  IF result_ IS NULL OR jsonb_typeof(result_) <> 'object'
     OR result_->>'userId' IS NULL
     OR jsonb_typeof(result_->'session') <> 'object'
  THEN
    RAISE EXCEPTION 'NATIVE_MAKE_SESSION_READ_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN result_;
END;
$native_read$;

REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_runtime_read(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_runtime_read(TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_runtime_read(TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_runtime_test;
GRANT EXECUTE ON FUNCTION clara_make_runtime_scope.native_runtime_read(TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
