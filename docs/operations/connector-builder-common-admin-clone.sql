-- ISOLATED CLONE ONLY. Add one reusable native grant/revoke command for all
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
 IF current_database()<>'neondb'
    OR session_user <> 'clara_make_runtime_login'
    OR w IS DISTINCT FROM 'melodie-digital'
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
REVOKE ALL ON FUNCTION clara_connector_builder.native_admin(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) FROM clara_make_provisioner_login;
GRANT EXECUTE ON FUNCTION clara_connector_builder.native_admin(
 TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB) TO clara_make_runtime_login;
