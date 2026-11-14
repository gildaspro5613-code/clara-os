-- CLONE ONLY: native Make readiness and certification evidence.
-- Not a Production migration. Never call Make; never return credentials.
-- Certification rows can only be inserted by the isolated database owner,
-- AFTER an independently witnessed, authenticated end-to-end READ and revoke.
CREATE TABLE IF NOT EXISTS clara_make_runtime_scope.native_make_read_certifications (
 workspace_id TEXT NOT NULL,
 client_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 connection_id TEXT NOT NULL,
 scenario_key TEXT NOT NULL,
 catalog_revision INTEGER NOT NULL CHECK (catalog_revision > 0),
 provider_execution_id TEXT NOT NULL CHECK (length(provider_execution_id) BETWEEN 8 AND 120),
 evidence_sha256 TEXT NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
 verified_by TEXT NOT NULL,
 verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (workspace_id,client_id,project_id,user_id,connection_id,scenario_key,catalog_revision)
);
REVOKE ALL ON TABLE clara_make_runtime_scope.native_make_read_certifications FROM PUBLIC;
REVOKE ALL ON TABLE clara_make_runtime_scope.native_make_read_certifications FROM clara_make_runtime_login;
REVOKE ALL ON TABLE clara_make_runtime_scope.native_make_read_certifications FROM clara_make_provisioner_login;

CREATE OR REPLACE FUNCTION clara_make_runtime_scope.native_make_readiness(
 digest TEXT, w TEXT, c TEXT, p TEXT, s TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $make_readiness$
DECLARE
 actor TEXT;
 conn_state TEXT;
 conn_scopes JSONB;
 contract_revision INTEGER;
 ready_catalog BOOLEAN := FALSE;
 authorized BOOLEAN := FALSE;
 certified BOOLEAN := FALSE;
 proof JSONB;
 next_state TEXT := 'uncertified';
BEGIN
 IF session_user <> 'clara_make_runtime_login'
    OR current_database() <> 'neondb'
    OR w IS DISTINCT FROM 'melodie-digital'
    OR digest IS NULL OR digest !~ '^[0-9a-f]{64}$'
 THEN
  RAISE EXCEPTION 'NATIVE_MAKE_STATUS_DENIED' USING ERRCODE='42501';
 END IF;

 -- The canonical runtime validates the actual session and all native selectors.
 actor := public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId';
 IF actor IS NULL THEN
  RAISE EXCEPTION 'NATIVE_MAKE_STATUS_DENIED' USING ERRCODE='42501';
 END IF;

 SELECT co.status,co.scopes INTO conn_state,conn_scopes
 FROM public.clara_connections co
 WHERE co.id='make-read-fixture-249-20261106'
   AND co.provider='make' AND co.workspace_id=w
   AND co.scopes @> '["make:scenario:find-drive-document"]'::jsonb
   AND EXISTS (SELECT 1 FROM public.clara_connection_credentials cc WHERE cc.connection_id=co.id)
 LIMIT 1;
 IF conn_state IS NULL THEN
  RETURN jsonb_build_object('state','uncertified','certified',FALSE,'authorized',FALSE);
 END IF;

 next_state := 'configured';
 SELECT cat.contract_revision INTO contract_revision
 FROM public.clara_native_make_scenario_catalog cat
 WHERE cat.scenario_key='find-drive-document'
   AND cat.make_scenario_id=7295042 AND cat.effect='READ'
   AND cat.enabled AND cat.reviewed_by IS NOT NULL
   AND cat.reviewed_at IS NOT NULL AND cat.revoked_at IS NULL
 LIMIT 1;
 ready_catalog := contract_revision IS NOT NULL;

 IF conn_state='ACTIVE' AND ready_catalog THEN
  proof := public.clara_native_make_read_resolve(digest,w,c,p,s,'find-drive-document');
  authorized := proof IS NOT NULL
     AND proof->>'connectionId'='make-read-fixture-249-20261106'
     AND proof->>'catalogRevision'=contract_revision::TEXT;
  SELECT EXISTS(
   SELECT 1 FROM clara_make_runtime_scope.native_make_read_certifications cert
   WHERE cert.workspace_id=w AND cert.client_id=c AND cert.project_id=p
     AND cert.user_id=actor AND cert.connection_id='make-read-fixture-249-20261106'
     AND cert.scenario_key='find-drive-document' AND cert.catalog_revision=contract_revision
  ) INTO certified;
  IF certified THEN
   next_state := CASE WHEN authorized THEN 'certified' ELSE 'certified_inactive' END;
  ELSIF authorized THEN
   next_state := 'ready_for_test';
  END IF;
 END IF;

 RETURN jsonb_build_object('state',next_state,'certified',certified,'authorized',authorized);
END;
$make_readiness$;

REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_make_readiness(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_make_readiness(TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.native_make_readiness(TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_runtime_test;
GRANT EXECUTE ON FUNCTION clara_make_runtime_scope.native_make_readiness(TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
