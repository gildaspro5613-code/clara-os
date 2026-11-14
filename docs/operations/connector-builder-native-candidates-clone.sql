-- Clone-only owner-visible candidates for explicit READ consent.
CREATE OR REPLACE FUNCTION clara_connector_builder.native_candidates(
 digest TEXT,w TEXT,c TEXT,p TEXT,s TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp
AS $builder_candidates$
DECLARE actor TEXT;result_ JSONB;
BEGIN
 IF session_user <> 'clara_make_runtime_login'
    OR current_database()<>'neondb'
    OR w IS DISTINCT FROM 'melodie-digital'
    OR digest IS NULL OR digest !~ '^[0-9a-f]{64}$'
 THEN
  RAISE EXCEPTION 'CONNECTOR_BUILDER_CANDIDATES_DENIED' USING ERRCODE='42501';
 END IF;
 actor:=public.clara_native_runtime_command(digest,w,c,p,s,'read','{}'::jsonb)->>'userId';
 IF actor IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.clara_workspace_memberships wm
  JOIN public.clara_registry_client_access ca
    ON ca.workspace_id=wm.workspace_id AND ca.user_id=wm.user_id
  JOIN public.clara_registry_project_access pa
    ON pa.workspace_id=wm.workspace_id AND pa.user_id=wm.user_id
  WHERE wm.workspace_id=w AND wm.user_id=actor AND wm.revoked_at IS NULL
    AND wm.role IN ('owner','admin')
    AND ca.client_id=c AND ca.can_manage AND ca.revoked_at IS NULL
    AND pa.project_id=p AND pa.can_manage AND pa.revoked_at IS NULL
 ) THEN
  RETURN '[]'::jsonb;
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'provider',scope.provider,'capabilityId',scope.capability_id,
   'connectionId',scope.connection_id
 ) ORDER BY scope.provider,scope.capability_id,scope.connection_id),'[]'::jsonb)
 INTO result_
 FROM(
  SELECT conn.provider,cat.capability_id,conn.id AS connection_id
  FROM clara_connector_builder.read_catalog cat
  JOIN public.clara_connections conn
    ON conn.provider=cat.provider AND conn.workspace_id=w AND conn.status='ACTIVE'
    AND conn.scopes @> cat.required_scopes
  JOIN public.clara_connection_credentials creds ON creds.connection_id=conn.id
  WHERE cat.effect='READ' AND cat.enabled AND cat.revoked_at IS NULL
    AND cat.reviewed_by IS NOT NULL AND cat.reviewed_at IS NOT NULL
  ORDER BY conn.provider,cat.capability_id,conn.id
  LIMIT 64
 ) scope;
 RETURN result_;
END;
$builder_candidates$;

REVOKE ALL ON FUNCTION clara_connector_builder.native_candidates(
 TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_connector_builder.native_candidates(
 TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
GRANT EXECUTE ON FUNCTION clara_connector_builder.native_candidates(
 TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
