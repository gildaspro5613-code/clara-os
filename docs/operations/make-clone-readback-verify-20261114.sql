-- ISOLATED CLONE ONLY. One fixed readback for AES-GCM integrity verification.
-- IMPORTANT: returns CIPHERTEXT to the already-limited provisioner role.
-- The user-side verification utility MUST NOT print the ciphertext or plaintext.
-- Does not authorize a Clara session, does not decrypt inside PostgreSQL,
-- does not change connections/grants and never calls Make.
CREATE OR REPLACE FUNCTION clara_make_runtime_scope.verify_make_ciphertext_readback()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $readback$
DECLARE
  v_ciphertext text;
BEGIN
  IF session_user <> 'clara_make_provisioner_login'
    OR current_database() <> 'neondb'
  THEN
    RAISE EXCEPTION 'MAKE_READBACK_DENIED' USING ERRCODE='42501';
  END IF;

  SELECT cc.encrypted_payload INTO v_ciphertext
  FROM public.clara_connections c
  JOIN public.clara_connection_credentials cc ON cc.connection_id=c.id
  WHERE c.id='make-read-fixture-249-20261106'
    AND c.provider='make'
    AND c.workspace_id='melodie-digital'
    AND c.status='CONFIGURED'
    AND c.scopes='["make:scenario:find-drive-document"]'::jsonb
    AND NOT EXISTS (SELECT 1 FROM public.clara_native_make_scenario_catalog WHERE enabled)
    AND NOT EXISTS (SELECT 1 FROM public.clara_native_make_read_authority WHERE revoked_at IS NULL)
  LIMIT 1;

  IF v_ciphertext IS NULL OR octet_length(v_ciphertext) NOT BETWEEN 90 AND 12000
  THEN
    RAISE EXCEPTION 'MAKE_READBACK_STATE_DENIED' USING ERRCODE='42501';
  END IF;

  RETURN v_ciphertext;
END;
$readback$;

REVOKE ALL ON FUNCTION clara_make_runtime_scope.verify_make_ciphertext_readback() FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.verify_make_ciphertext_readback() FROM clara_make_runtime_login;
GRANT EXECUTE ON FUNCTION clara_make_runtime_scope.verify_make_ciphertext_readback()
  TO clara_make_provisioner_login;
