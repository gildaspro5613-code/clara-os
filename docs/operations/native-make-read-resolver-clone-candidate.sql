-- Clone-only reception proposal for PR #249.
-- Native-scope read resolver; no raw SELECT on clara_connections for the app role.
-- The owner of this function must be trusted, and public schema CREATE denied.
-- Review separately before any Production installation.
CREATE OR REPLACE FUNCTION public.clara_native_make_read_resolve(
  digest TEXT, w TEXT, c TEXT, p TEXT, s TEXT, requested_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $make_read$
DECLARE
  actor TEXT;
  receipt JSONB;
BEGIN
  IF requested_key IS NULL
     OR length(requested_key) NOT BETWEEN 1 AND 120
     OR requested_key !~ '^[a-z][a-z0-9-]+$'
  THEN RETURN NULL; END IF;

  -- Canonical native authentication, session and project scope, never caller userId.
  actor := public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId';
  IF actor IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'connectionId', g.connection_id, 'revision', g.revision,
    'catalogRevision', cat.contract_revision
  ) INTO receipt
  FROM public.clara_native_make_read_authority g
  JOIN public.clara_connections conn ON conn.id=g.connection_id
    AND conn.workspace_id=w AND conn.provider='make' AND conn.status='ACTIVE'
  JOIN public.clara_native_make_scenario_catalog cat
    ON cat.scenario_key=g.scenario_key AND cat.effect='READ'
    AND cat.enabled AND cat.reviewed_by IS NOT NULL
    AND cat.reviewed_at IS NOT NULL AND cat.revoked_at IS NULL
  WHERE g.workspace_id=w AND g.client_id=c AND g.project_id=p
    AND g.owner_user_id=actor AND g.scenario_key=requested_key
    AND g.revoked_at IS NULL AND g.revision>0
    AND conn.scopes @> jsonb_build_array('make:scenario:'||requested_key)
  ORDER BY g.revision DESC, g.connection_id
  LIMIT 1;

  RETURN receipt;
END;
$make_read$;
REVOKE ALL ON FUNCTION public.clara_native_make_read_resolve(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
-- On clone only, after role review:
-- GRANT EXECUTE ON FUNCTION public.clara_native_make_read_resolve(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
-- TO clara_make_runtime_test;
