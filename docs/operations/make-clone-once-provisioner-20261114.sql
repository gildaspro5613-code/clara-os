-- ISOLATED NEON CLONE ONLY: br-nameless-dew-b2v6asgj.
-- No secret values in this file. Apply CREATE/REVOKE/GRANT atomically.
-- The provisioner accepts only an already AES-256-GCM-encrypted envelope.
-- It never grants scenario execution and never sets connection ACTIVE.
CREATE OR REPLACE FUNCTION clara_make_runtime_scope.provision_make_read_ciphertext_once(p_envelope text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $provision$
DECLARE
  obj jsonb;
  v_conn public.clara_connections%ROWTYPE;
  v_iv bytea;
  v_tag bytea;
  v_cipher bytea;
BEGIN
  IF session_user <> 'clara_make_provisioner_login'
    OR current_database() <> 'neondb'
    OR p_envelope IS NULL
    OR octet_length(p_envelope) NOT BETWEEN 90 AND 12000
  THEN RAISE EXCEPTION 'MAKE_PROVISION_DENIED' USING ERRCODE='42501'; END IF;

  BEGIN
    obj := p_envelope::jsonb;
    IF jsonb_typeof(obj) <> 'object'
      OR (SELECT count(*) FROM jsonb_object_keys(obj)) <> 3
      OR NOT (obj ?& array['iv','tag','ciphertext'])
      OR jsonb_typeof(obj->'iv') <> 'string'
      OR jsonb_typeof(obj->'tag') <> 'string'
      OR jsonb_typeof(obj->'ciphertext') <> 'string'
      OR length(obj->>'iv') <> 16
      OR length(obj->>'tag') <> 24
      OR length(obj->>'ciphertext') NOT BETWEEN 4 AND 11000
    THEN RAISE EXCEPTION 'invalid'; END IF;
    v_iv := decode(obj->>'iv','base64');
    v_tag := decode(obj->>'tag','base64');
    v_cipher := decode(obj->>'ciphertext','base64');
    IF octet_length(v_iv) <> 12 OR octet_length(v_tag) <> 16
      OR octet_length(v_cipher) < 1
    THEN RAISE EXCEPTION 'invalid'; END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'MAKE_ENVELOPE_INVALID' USING ERRCODE='22023';
  END;

  SELECT * INTO v_conn FROM public.clara_connections
    WHERE id = 'make-read-fixture-249-20261106'
      AND workspace_id = 'melodie-digital'
      AND provider = 'make'
    FOR UPDATE;

  IF NOT FOUND
    OR v_conn.status <> 'RECONNECT_REQUIRED'
    OR v_conn.scopes <> '["make:scenario:find-drive-document"]'::jsonb
    OR EXISTS (
       SELECT 1 FROM public.clara_connection_credentials
       WHERE connection_id = 'make-read-fixture-249-20261106'
    )
  THEN RAISE EXCEPTION 'MAKE_PROVISION_STATE_DENIED' USING ERRCODE='42501'; END IF;

  INSERT INTO public.clara_connection_credentials(connection_id,encrypted_payload,updated_at)
    VALUES ('make-read-fixture-249-20261106',p_envelope,NOW());

  UPDATE public.clara_connections SET status='CONFIGURED',updated_at=NOW()
    WHERE id = 'make-read-fixture-249-20261106';

  -- A response must never contain the secret or ciphertext.
  RETURN 'MAKE_CIPHERTEXT_STORED_INACTIVE';
END;
$provision$;

REVOKE ALL ON FUNCTION clara_make_runtime_scope.provision_make_read_ciphertext_once(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_make_runtime_scope.provision_make_read_ciphertext_once(text) FROM clara_make_runtime_login;
GRANT EXECUTE ON FUNCTION clara_make_runtime_scope.provision_make_read_ciphertext_once(text)
  TO clara_make_provisioner_login;
