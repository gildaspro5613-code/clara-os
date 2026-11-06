-- REVIEW CANDIDATE ONLY, FOR THE ISOLATED NEON CLONE.
-- NOT A PRODUCTION MIGRATION. No credentials, provider calls or WRITE/SEND.
-- Requires docs/operations/native-make-read-authority-proposal.sql already applied.
-- Register future scenario metadata under a separately certified dynamic registry;
-- the initial three READ keys intentionally stay fixed until then.
CREATE TABLE IF NOT EXISTS public.clara_native_make_admin_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  connection_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  scenario_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('grant','revoke')),
  revision BIGINT NOT NULL CHECK (revision > 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.clara_native_make_admin_command(
  digest TEXT, w TEXT, c TEXT, p TEXT, s TEXT,
  operation TEXT, payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $make$
DECLARE
  view JSONB;
  actor TEXT;
  v_connection_id TEXT;
  v_recipient TEXT;
  v_scenario_key TEXT;
  v_reason TEXT;
  revision_out BIGINT;
BEGIN
  -- Existing native command certifies the authenticated session / requested scope.
  view := public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb);
  actor := view->>'userId';

  IF operation NOT IN ('grant','revoke')
     OR payload IS NULL OR jsonb_typeof(payload) <> 'object'
     OR actor IS NULL OR view->>'canWrite' IS DISTINCT FROM 'true'
  THEN RAISE EXCEPTION 'NATIVE_MAKE_ADMIN_DENIED' USING ERRCODE='42501'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clara_workspace_memberships wm
    WHERE wm.user_id=actor AND wm.workspace_id=w
      AND wm.revoked_at IS NULL AND wm.role IN ('owner','admin')
  ) OR NOT EXISTS (
    SELECT 1 FROM public.clara_registry_client_access ca
    WHERE ca.user_id=actor AND ca.workspace_id=w AND ca.client_id=c
      AND ca.can_manage AND ca.revoked_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.clara_registry_project_access pa
    WHERE pa.user_id=actor AND pa.workspace_id=w AND pa.project_id=p
      AND pa.can_manage AND pa.revoked_at IS NULL
  ) THEN RAISE EXCEPTION 'NATIVE_MAKE_ADMIN_DENIED' USING ERRCODE='42501'; END IF;

  v_connection_id := payload->>'connectionId';
  v_recipient := payload->>'ownerUserId';
  v_scenario_key := payload->>'scenarioKey';
  v_reason := payload->>'reason';
  IF v_connection_id IS NULL OR length(v_connection_id) NOT BETWEEN 1 AND 256
     OR v_recipient IS NULL OR length(v_recipient) NOT BETWEEN 1 AND 256
     OR v_scenario_key IS NULL
     OR length(v_scenario_key) NOT BETWEEN 1 AND 120
     OR v_scenario_key !~ '^[a-zA-Z0-9._:-]+$'
     OR v_scenario_key IN ('__proto__','prototype','constructor')
     OR (payload - 'connectionId' - 'ownerUserId' - 'scenarioKey' - 'reason') <> '{}'::jsonb
     OR NOT EXISTS (
       SELECT 1 FROM public.clara_registry_projects pr
       JOIN public.clara_registry_clients cl
         ON cl.workspace_id=pr.workspace_id AND cl.id=pr.client_id
       WHERE pr.workspace_id=w AND pr.id=p AND pr.client_id=c
         AND pr.revoked_at IS NULL AND cl.revoked_at IS NULL
     )
  THEN RAISE EXCEPTION 'NATIVE_MAKE_SCOPE_DENIED' USING ERRCODE='42501'; END IF;

  -- Serialization for the same grant key, including retries.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    jsonb_build_array(v_connection_id,w,c,p,v_recipient,v_scenario_key)::text,0));

  IF operation = 'grant' THEN
    IF v_reason IS NULL OR length(btrim(v_reason)) NOT BETWEEN 20 AND 2000
       OR v_scenario_key NOT IN ('find-drive-document','check-calendar-availability','search-calendar-events')
       OR NOT EXISTS (
         SELECT 1 FROM public.clara_native_make_scenario_catalog catalog
         WHERE catalog.scenario_key=v_scenario_key AND catalog.effect='READ'
           AND catalog.enabled=TRUE AND catalog.reviewed_by IS NOT NULL
           AND catalog.reviewed_at IS NOT NULL AND catalog.revoked_at IS NULL
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.clara_auth_identities ai WHERE ai.user_id=v_recipient
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.clara_workspace_memberships wm
         WHERE wm.user_id=v_recipient AND wm.workspace_id=w AND wm.revoked_at IS NULL
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.clara_registry_client_access ca
         WHERE ca.user_id=v_recipient AND ca.workspace_id=w AND ca.client_id=c
           AND ca.can_read AND ca.revoked_at IS NULL
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.clara_registry_project_access pa
         WHERE pa.user_id=v_recipient AND pa.workspace_id=w AND pa.project_id=p
           AND pa.can_read AND pa.revoked_at IS NULL
       )
       OR NOT EXISTS (
         SELECT 1 FROM public.clara_connections co
         WHERE co.id=v_connection_id AND co.provider='make'
           AND co.workspace_id=w AND co.status='ACTIVE'
           AND co.scopes @> jsonb_build_array('make:scenario:'||v_scenario_key)
       )
    THEN RAISE EXCEPTION 'NATIVE_MAKE_GRANT_DENIED' USING ERRCODE='42501'; END IF;

    INSERT INTO public.clara_native_make_read_authority (
      connection_id,owner_user_id,workspace_id,client_id,project_id,
      scenario_key,revision,approved_by,review_reason
    ) VALUES (v_connection_id,v_recipient,w,c,p,v_scenario_key,1,actor,v_reason)
    ON CONFLICT (connection_id,owner_user_id,client_id,project_id,scenario_key)
    DO UPDATE SET revision=clara_native_make_read_authority.revision+1,
      revoked_at=NULL,approved_by=EXCLUDED.approved_by,
      review_reason=EXCLUDED.review_reason,reviewed_at=NOW()
    RETURNING revision INTO revision_out;
  ELSE
    UPDATE public.clara_native_make_read_authority a
       SET revision=a.revision+1,revoked_at=NOW()
     WHERE a.connection_id=v_connection_id AND a.workspace_id=w
       AND a.client_id=c AND a.project_id=p
       AND a.owner_user_id=v_recipient AND a.scenario_key=v_scenario_key
       AND a.revoked_at IS NULL
    RETURNING revision INTO revision_out;
    IF revision_out IS NULL THEN
      RAISE EXCEPTION 'NATIVE_MAKE_GRANT_NOT_FOUND' USING ERRCODE='42501';
    END IF;
  END IF;

  -- This INSERT is in the same transaction as the grant/revoke DML.
  INSERT INTO public.clara_native_make_admin_audit (
    connection_id,workspace_id,client_id,project_id,owner_user_id,
    actor_user_id,scenario_key,operation,revision
  ) VALUES (
    v_connection_id,w,c,p,v_recipient,actor,v_scenario_key,operation,revision_out
  );

  RETURN jsonb_build_object(
    'operation',operation,'scenarioKey',v_scenario_key,'revision',revision_out
  );
END;
$make$;

REVOKE ALL ON FUNCTION public.clara_native_make_admin_command(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON TABLE public.clara_native_make_admin_audit FROM PUBLIC;
REVOKE ALL ON TABLE public.clara_native_make_read_authority FROM PUBLIC;

-- SECURITY REVIEW REQUIRED BEFORE APPLYING THIS REVISION:
-- - A trusted owner owns the function and its Make tables; the HTTP runtime MUST
--   be connected through a separate, non-owner, non-superuser role.
-- - After review, grant EXECUTE only to that exact role; keep direct table DML
--   denied. Do not grant EXECUTE to PUBLIC or any shared Neon service role.
-- - SECURITY DEFINER must retain canonical-session verification, fully-qualified
--   object references and a restricted search_path.
-- - This file has not yet been applied in this SECURITY DEFINER form on Neon.
-- - Do not grant the real application role access without an authenticated
--   positive + negative review of the complete command and durable audit.
-- Do NOT execute on the Production branch.
