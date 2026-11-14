-- ONE GENERIC BUILDER AUTHORITY — isolated Neon clone ONLY.
-- Not a Production migration; no Make/Brevo/Stripe credentials are read
-- or modified by installation. Requires a reviewed app role before Production.
-- An adapter/credential entry is NOT a native permission or certification.
CREATE SCHEMA IF NOT EXISTS clara_connector_builder;
REVOKE ALL ON SCHEMA clara_connector_builder FROM PUBLIC;
GRANT USAGE ON SCHEMA clara_connector_builder TO clara_make_runtime_login;

CREATE TABLE IF NOT EXISTS clara_connector_builder.read_catalog (
 provider TEXT NOT NULL CHECK (provider ~ '^[a-z][a-z0-9_-]{0,63}$'),
 capability_id TEXT NOT NULL CHECK (capability_id ~ '^[a-z][a-z0-9._:-]{1,119}$'),
 effect TEXT NOT NULL DEFAULT 'READ' CHECK (effect='READ'),
 required_scopes JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(required_scopes)='array'),
 contract_revision INTEGER NOT NULL CHECK (contract_revision>0),
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 reviewed_by TEXT,
 reviewed_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ,
 PRIMARY KEY (provider,capability_id),
 CHECK (capability_id LIKE provider || '.%'),
 CHECK (enabled=FALSE OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND revoked_at IS NULL))
);
REVOKE ALL ON TABLE clara_connector_builder.read_catalog FROM PUBLIC;
REVOKE ALL ON TABLE clara_connector_builder.read_catalog FROM clara_make_runtime_login;

CREATE TABLE IF NOT EXISTS clara_connector_builder.read_grants (
 connection_id TEXT NOT NULL REFERENCES public.clara_connections(id),
 owner_user_id TEXT NOT NULL,
 workspace_id TEXT NOT NULL,
 client_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 provider TEXT NOT NULL,
 capability_id TEXT NOT NULL,
 revision BIGINT NOT NULL DEFAULT 1 CHECK (revision>0),
 approved_by TEXT NOT NULL,
 review_reason TEXT NOT NULL CHECK (length(review_reason) BETWEEN 8 AND 500),
 reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 revoked_at TIMESTAMPTZ,
 PRIMARY KEY (connection_id,owner_user_id,client_id,project_id,capability_id),
 FOREIGN KEY (provider,capability_id)
  REFERENCES clara_connector_builder.read_catalog(provider,capability_id)
);
REVOKE ALL ON TABLE clara_connector_builder.read_grants FROM PUBLIC;
REVOKE ALL ON TABLE clara_connector_builder.read_grants FROM clara_make_runtime_login;

CREATE TABLE IF NOT EXISTS clara_connector_builder.read_audit (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 workspace_id TEXT NOT NULL,
 client_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 actor_user_id TEXT NOT NULL,
 owner_user_id TEXT,
 connection_id TEXT,
 provider TEXT NOT NULL,
 capability_id TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('GRANT','REVOKE','REQUESTED','DENIED','SUCCEEDED','FAILED')),
 revision BIGINT,
 reason TEXT,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE clara_connector_builder.read_audit FROM PUBLIC;
REVOKE ALL ON TABLE clara_connector_builder.read_audit FROM clara_make_runtime_login;

-- Readiness/credentials only, not permission creation.
-- The same stable call covers every vetted provider with one SQL authority.
CREATE OR REPLACE FUNCTION clara_connector_builder.native_read(
 digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,requested_capability TEXT,
 operation TEXT DEFAULT 'authorize'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $builder_read$
DECLARE
 actor TEXT; receipt JSONB;
BEGIN
 IF current_database()<>'neondb'
   OR session_user <> 'clara_make_runtime_login'
   OR w IS DISTINCT FROM 'melodie-digital'
   OR digest IS NULL OR digest !~ '^[a-f0-9]{64}$'
   OR requested_capability IS NULL
   OR requested_capability !~ '^[a-z][a-z0-9._:-]{1,119}$'
   OR operation NOT IN ('authorize','credentials')
 THEN
  RAISE EXCEPTION 'CONNECTOR_NATIVE_SCOPE_DENIED' USING ERRCODE='42501';
 END IF;

 -- Original signed session + client/project authorization, not a submitted
 -- user identifier. This is the SAME native auth used by Clara OS.
 actor:=public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId';
 IF actor IS NULL THEN
  RAISE EXCEPTION 'CONNECTOR_NATIVE_SCOPE_DENIED' USING ERRCODE='42501';
 END IF;

 -- An owner can have several accounts, but Clara must never silently
 -- choose a different account for the same READ capability.
 IF (
  SELECT COUNT(DISTINCT gr.connection_id)
  FROM clara_connector_builder.read_grants gr
  JOIN clara_connector_builder.read_catalog cat
    ON cat.provider=gr.provider AND cat.capability_id=gr.capability_id
  JOIN public.clara_connections co ON co.id=gr.connection_id
    AND co.provider=cat.provider AND co.workspace_id=w AND co.status='ACTIVE'
  JOIN public.clara_connection_credentials cc ON cc.connection_id=co.id
  WHERE gr.workspace_id=w AND gr.client_id=c AND gr.project_id=p
    AND gr.owner_user_id=actor AND gr.capability_id=requested_capability
    AND gr.revoked_at IS NULL AND cat.effect='READ'
    AND cat.enabled AND cat.revoked_at IS NULL
    AND cat.reviewed_by IS NOT NULL AND cat.reviewed_at IS NOT NULL
    AND co.scopes @> cat.required_scopes
 ) <> 1 THEN RETURN NULL; END IF;

 SELECT jsonb_build_object(
   'userId',actor,'workspaceId',w,'clientId',c,'projectId',p,
   'provider',cat.provider,'capabilityId',cat.capability_id,
   'connectionId',conn.id,'revision',gr.revision,
   'catalogRevision',cat.contract_revision,
   'encryptedPayload',CASE WHEN operation='credentials'
      THEN creds.encrypted_payload ELSE NULL END
 ) INTO receipt
 FROM clara_connector_builder.read_grants gr
 JOIN clara_connector_builder.read_catalog cat
   ON cat.provider=gr.provider AND cat.capability_id=gr.capability_id
 JOIN public.clara_connections conn
   ON conn.id=gr.connection_id AND conn.provider=cat.provider
   AND conn.workspace_id=w AND conn.status='ACTIVE'
 JOIN public.clara_connection_credentials creds ON creds.connection_id=conn.id
 WHERE gr.workspace_id=w AND gr.client_id=c AND gr.project_id=p
   AND gr.owner_user_id=actor AND gr.capability_id=requested_capability
   AND gr.revoked_at IS NULL AND gr.revision>0
   AND cat.effect='READ' AND cat.enabled AND cat.revoked_at IS NULL
   AND cat.reviewed_by IS NOT NULL AND cat.reviewed_at IS NOT NULL
   AND conn.scopes @> cat.required_scopes
 ORDER BY gr.revision DESC,gr.connection_id
 LIMIT 1;

 -- Never return credentials in authorization-only response.
 IF receipt IS NULL THEN RETURN NULL; END IF;
 IF operation='authorize' THEN RETURN receipt-'encryptedPayload'; END IF;
 RETURN receipt;
END;
$builder_read$;

REVOKE ALL ON FUNCTION clara_connector_builder.native_read(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_connector_builder.native_read(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
GRANT EXECUTE ON FUNCTION clara_connector_builder.native_read(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
