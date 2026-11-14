-- CLONE ONLY: br-nameless-dew-b2v6asgj, not a Production migration.
-- Exposes only an AES-256-GCM envelope after canonical native session +
-- exact workspace/client/project/user/scenario grant are certified by the
-- existing SECURITY DEFINER read resolver. Never returns plaintext or token.
CREATE OR REPLACE FUNCTION clara_make_runtime_scope.native_make_read_ciphertext(
  digest TEXT, w TEXT, c TEXT, p TEXT, s TEXT, requested_key TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $make_material$
DECLARE
  proof JSONB;
  ciphertext TEXT;
BEGIN
  IF session_user <> 'clara_make_runtime_login'
     OR current_database() <> 'neondb'
     OR w IS DISTINCT FROM 'melodie-digital'
     OR requested_key IS DISTINCT FROM 'find-drive-document'
  THEN
    RAISE EXCEPTION 'NATIVE_MAKE_MATERIAL_DENIED' USING ERRCODE='42501';
  END IF;

  -- Canonical runtime checks actor identity and every scope selector.
  proof := public.clara_native_make_read_resolve(digest,w,c,p,s,requested_key);
  IF proof IS NULL
     OR jsonb_typeof(proof) <> 'object'
     OR proof->>'connectionId' IS DISTINCT FROM 'make-read-fixture-249-20261106'
     OR NOT (proof ? 'revision')
     OR (proof->>'revision') !~ '^[1-9][0-9]{0,18}$'
  THEN
    RAISE EXCEPTION 'NATIVE_MAKE_MATERIAL_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT cc.encrypted_payload INTO ciphertext
    FROM public.clara_connections conn
    JOIN public.clara_connection_credentials cc ON cc.connection_id=conn.id
    JOIN public.clara_native_make_read_authority grant_record
      ON grant_record.connection_id=conn.id
    JOIN public.clara_native_make_scenario_catalog catalog
      ON catalog.scenario_key=grant_record.scenario_key
   WHERE conn.id='make-read-fixture-249-20261106'
     AND conn.workspace_id=w AND conn.provider='make'
     AND conn.status='ACTIVE'
     AND conn.scopes='["make:scenario:find-drive-document"]'::jsonb
     AND grant_record.workspace_id=w
     AND grant_record.client_id=c AND grant_record.project_id=p
     AND grant_record.scenario_key=requested_key
     AND grant_record.revoked_at IS NULL
     AND grant_record.revision=(proof->>'revision')::BIGINT
     AND grant_record.owner_user_id=(
       public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId'
     )
     AND catalog.effect='READ'
     AND catalog.make_scenario_id=7295042
     AND catalog.enabled
     AND catalog.reviewed_by IS NOT NULL
     AND catalog.reviewed_at IS NOT NULL
     AND catalog.revoked_at IS NULL
   LIMIT 1;

  IF ciphertext IS NULL OR octet_length(ciphertext) NOT BETWEEN 90 AND 12000
  THEN
    RAISE EXCEPTION 'NATIVE_MAKE_MATERIAL_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN ciphertext;
END;
$make_material$;

REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_make_read_ciphertext(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_make_read_ciphertext(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_make_read_ciphertext(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_runtime_test;
GRANT EXECUTE ON FUNCTION clara_make_runtime_scope.native_make_read_ciphertext(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
