-- Clara OS Connector Builder — candidate shared READ authority.
-- Prepared in isolation; DO NOT apply without an explicit Production GO,
-- pre-migration backup, limited DB runtime role review, and rollback plan.
-- No connector activation, grants, secrets or scenario execution.
-- The canonical Clara session enforces workspace, client, project and user.
BEGIN;

-- Not a Production migration; no Make/Brevo/Stripe credentials are read
-- or modified by installation. Requires a reviewed app role before Production.
-- An adapter/credential entry is NOT a native permission or certification.
CREATE SCHEMA IF NOT EXISTS clara_connector_builder;
REVOKE ALL ON SCHEMA clara_connector_builder FROM PUBLIC;

-- The database owner must explicitly configure one verified, limited
-- runtime service role after reviewing the target environment and before
-- activating this migration's functions. No application role is granted by
-- the migration itself.
CREATE TABLE IF NOT EXISTS clara_connector_builder.service_roles (
 role_name TEXT PRIMARY KEY CHECK (length(role_name) BETWEEN 1 AND 128),
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 configured_by TEXT NOT NULL,
 configured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON clara_connector_builder.service_roles FROM PUBLIC;

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
 CHECK (enabled=FALSE OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND revoked_at IS NULL AND jsonb_array_length(required_scopes)>0))
);
REVOKE ALL ON TABLE clara_connector_builder.read_catalog FROM PUBLIC;
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
 IF NOT EXISTS (SELECT 1 FROM clara_connector_builder.service_roles sr WHERE sr.role_name=session_user AND sr.enabled)
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

-- reviewed READ capabilities, not a Make-specific admin command.
-- Never exposes credentials; write or execute provider operations cannot be
-- granted through this function. No browser route is introduced here.
CREATE OR REPLACE FUNCTION clara_connector_builder.native_admin(
 digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT,operation TEXT,payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $builder_admin$
DECLARE
 actor TEXT; target_user TEXT; conn_id TEXT; cap TEXT; reason_ TEXT;
 provider_ TEXT; revision_ BIGINT;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM clara_connector_builder.service_roles sr WHERE sr.role_name=session_user AND sr.enabled)
    OR digest IS NULL OR digest !~ '^[a-f0-9]{64}$'
    OR operation NOT IN ('grant','revoke')
    OR payload IS NULL OR jsonb_typeof(payload)<>'object'
    OR payload->'approve' IS DISTINCT FROM 'true'::jsonb
 THEN RAISE EXCEPTION 'CONNECTOR_BUILDER_ADMIN_DENIED' USING ERRCODE='42501'; END IF;

 target_user:=payload->>'ownerUserId';
 conn_id:=payload->>'connectionId';
 cap:=payload->>'capabilityId';
 reason_:=payload->>'reason';
 IF target_user IS NULL OR length(target_user) NOT BETWEEN 1 AND 160
    OR conn_id IS NULL OR length(conn_id) NOT BETWEEN 1 AND 160
    OR cap IS NULL OR cap !~ '^[a-z][a-z0-9._:-]{1,119}$'
    OR reason_ IS NULL OR length(reason_) NOT BETWEEN 8 AND 500
 THEN RAISE EXCEPTION 'CONNECTOR_BUILDER_ADMIN_INPUT_DENIED' USING ERRCODE='42501'; END IF;

 -- Write-authorized canonical session already checks client and project
 -- management. Neither the browser nor the chat may supply the actor.
 actor:=public.clara_native_runtime_command(digest,w,c,p,s,'write','{}'::jsonb)->>'userId';
 IF actor IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.clara_workspace_memberships wm
   JOIN public.clara_registry_client_access ca
    ON ca.workspace_id=wm.workspace_id AND ca.user_id=wm.user_id
   JOIN public.clara_registry_project_access pa
    ON pa.workspace_id=wm.workspace_id AND pa.user_id=wm.user_id
   WHERE wm.workspace_id=w AND wm.user_id=actor AND wm.revoked_at IS NULL
    AND wm.role IN ('owner','admin') AND ca.client_id=c AND ca.can_manage
    AND ca.revoked_at IS NULL AND pa.project_id=p AND pa.can_manage
    AND pa.revoked_at IS NULL
 ) THEN RAISE EXCEPTION 'CONNECTOR_BUILDER_ADMIN_DENIED' USING ERRCODE='42501'; END IF;

 -- A READ target must already possess canonical workspace/client/project READ.
 IF operation='grant' AND NOT EXISTS(
   SELECT 1 FROM public.clara_workspace_memberships wm
   JOIN public.clara_registry_client_access ca
    ON ca.workspace_id=wm.workspace_id AND ca.user_id=wm.user_id
   JOIN public.clara_registry_project_access pa
    ON pa.workspace_id=wm.workspace_id AND pa.user_id=wm.user_id
   WHERE wm.workspace_id=w AND wm.user_id=target_user AND wm.revoked_at IS NULL
    AND ca.client_id=c AND ca.can_read AND ca.revoked_at IS NULL
    AND pa.project_id=p AND pa.can_read AND pa.revoked_at IS NULL
 ) THEN RAISE EXCEPTION 'CONNECTOR_BUILDER_TARGET_DENIED' USING ERRCODE='42501'; END IF;

 IF operation='grant' THEN
  SELECT co.provider INTO provider_
  FROM public.clara_connections co
  JOIN clara_connector_builder.read_catalog cat
    ON cat.provider=co.provider AND cat.capability_id=cap
  JOIN public.clara_connection_credentials cc ON cc.connection_id=co.id
  WHERE co.id=conn_id AND co.workspace_id=w AND co.status='ACTIVE'
    AND co.scopes @> cat.required_scopes
    AND cat.effect='READ' AND cat.enabled AND cat.reviewed_by IS NOT NULL
    AND cat.reviewed_at IS NOT NULL AND cat.revoked_at IS NULL
  FOR SHARE OF co,cat,cc;
  IF provider_ IS NULL THEN
   RAISE EXCEPTION 'CONNECTOR_BUILDER_NOT_CERTIFIED' USING ERRCODE='42501';
  END IF;
  INSERT INTO clara_connector_builder.read_grants(
    connection_id,owner_user_id,workspace_id,client_id,project_id,
    provider,capability_id,revision,approved_by,review_reason
  ) VALUES(conn_id,target_user,w,c,p,provider_,cap,1,actor,reason_)
  ON CONFLICT (connection_id,owner_user_id,client_id,project_id,capability_id)
  DO UPDATE SET revision=clara_connector_builder.read_grants.revision+1,
    approved_by=EXCLUDED.approved_by,review_reason=EXCLUDED.review_reason,
    reviewed_at=now(),revoked_at=NULL
  RETURNING revision INTO revision_;
 ELSE
  UPDATE clara_connector_builder.read_grants g
  SET revision=g.revision+1,revoked_at=now(),
    approved_by=actor,review_reason=reason_,reviewed_at=now()
  WHERE g.connection_id=conn_id AND g.owner_user_id=target_user
    AND g.workspace_id=w AND g.client_id=c AND g.project_id=p
    AND g.capability_id=cap AND g.revoked_at IS NULL
  RETURNING g.revision,g.provider INTO revision_,provider_;
  IF revision_ IS NULL THEN
   RAISE EXCEPTION 'CONNECTOR_BUILDER_GRANT_NOT_FOUND' USING ERRCODE='42501';
  END IF;
 END IF;

 INSERT INTO clara_connector_builder.read_audit(
  workspace_id,client_id,project_id,actor_user_id,owner_user_id,
  connection_id,provider,capability_id,phase,revision,reason
 ) VALUES(w,c,p,actor,target_user,conn_id,provider_,cap,
   upper(operation),revision_,reason_);
 RETURN jsonb_build_object('operation',operation,'revision',revision_,
  'capabilityId',cap);
END;
$builder_admin$;

REVOKE ALL ON FUNCTION clara_connector_builder.native_admin(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;

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
 IF NOT EXISTS (SELECT 1 FROM clara_connector_builder.service_roles sr WHERE sr.role_name=session_user AND sr.enabled)
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

-- through the canonical signed Clara OS session; not a global inventory.
-- Returns only non-secret provider/capability identifiers.
CREATE OR REPLACE FUNCTION clara_connector_builder.native_discover(
 digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $builder_discover$
DECLARE actor TEXT; result_ JSONB;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM clara_connector_builder.service_roles sr WHERE sr.role_name=session_user AND sr.enabled)
    OR digest IS NULL OR digest !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'CONNECTOR_BUILDER_DISCOVERY_DENIED' USING ERRCODE='42501'; END IF;

 actor:=public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId';
 IF actor IS NULL THEN
  RAISE EXCEPTION 'CONNECTOR_BUILDER_DISCOVERY_DENIED' USING ERRCODE='42501';
 END IF;

 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'provider',d.provider,
   'capabilityId',d.capability_id,
   'connectionId',d.connection_id,
   'revision',d.revision,
   'catalogRevision',d.contract_revision
 ) ORDER BY d.provider,d.capability_id,d.connection_id),'[]'::jsonb)
 INTO result_
 FROM (
  SELECT DISTINCT cat.provider,cat.capability_id,co.id AS connection_id,
   gr.revision,cat.contract_revision
  FROM clara_connector_builder.read_catalog cat
  JOIN clara_connector_builder.read_grants gr
   ON gr.provider=cat.provider AND gr.capability_id=cat.capability_id
  JOIN public.clara_connections co ON co.id=gr.connection_id
   AND co.provider=cat.provider AND co.workspace_id=w AND co.status='ACTIVE'
  WHERE cat.effect='READ' AND cat.enabled
   AND cat.reviewed_by IS NOT NULL AND cat.reviewed_at IS NOT NULL
   AND cat.revoked_at IS NULL AND gr.revoked_at IS NULL
   AND gr.workspace_id=w AND gr.client_id=c AND gr.project_id=p
   AND gr.owner_user_id=actor
   AND co.scopes @> cat.required_scopes
   AND EXISTS(SELECT 1 FROM public.clara_connection_credentials cc
      WHERE cc.connection_id=co.id)
  LIMIT 64
 ) AS d;
 RETURN result_;
END;
$builder_discover$;

REVOKE ALL ON FUNCTION clara_connector_builder.native_discover(
 TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
COMMIT;
