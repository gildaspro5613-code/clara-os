-- Clone only. Discover the CURRENT USER'S reviewed READ capabilities
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
 IF current_database()<>'neondb'
    OR session_user <> 'clara_make_runtime_login'
    OR w IS DISTINCT FROM 'melodie-digital'
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
REVOKE ALL ON FUNCTION clara_connector_builder.native_discover(
 TEXT,TEXT,TEXT,TEXT,TEXT) FROM clara_make_provisioner_login;
GRANT EXECUTE ON FUNCTION clara_connector_builder.native_discover(
 TEXT,TEXT,TEXT,TEXT,TEXT) TO clara_make_runtime_login;
