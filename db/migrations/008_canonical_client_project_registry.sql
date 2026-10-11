-- Additive foundation. Apply only through reviewed migration operations.
-- No existing record is inferred, converted, enrolled or backfilled.
BEGIN;

CREATE TABLE IF NOT EXISTS clara_registry_clients (
  workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
  id TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
  created_by TEXT NOT NULL REFERENCES clara_auth_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, id)
);
CREATE TABLE IF NOT EXISTS clara_registry_projects (
  workspace_id TEXT NOT NULL,
  id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
  created_by TEXT NOT NULL REFERENCES clara_auth_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, id, client_id),
  FOREIGN KEY (workspace_id, client_id) REFERENCES clara_registry_clients(workspace_id, id)
);
CREATE TABLE IF NOT EXISTS clara_registry_client_access (
  workspace_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
  can_read BOOLEAN NOT NULL,
  can_archive BOOLEAN NOT NULL,
  can_manage BOOLEAN NOT NULL,
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, client_id, user_id),
  FOREIGN KEY (workspace_id, client_id) REFERENCES clara_registry_clients(workspace_id, id),
  CHECK ((NOT can_archive AND NOT can_manage) OR can_read)
);
CREATE TABLE IF NOT EXISTS clara_registry_project_access (
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
  can_read BOOLEAN NOT NULL,
  can_archive BOOLEAN NOT NULL,
  can_manage BOOLEAN NOT NULL,
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, project_id, user_id),
  FOREIGN KEY (workspace_id, project_id) REFERENCES clara_registry_projects(workspace_id, id),
  CHECK ((NOT can_archive AND NOT can_manage) OR can_read)
);
CREATE TABLE IF NOT EXISTS clara_registry_identity_links (
  workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
  os_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
  live_user_id TEXT NOT NULL CHECK (length(live_user_id) BETWEEN 1 AND 160),
  proof_id TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, os_user_id),
  UNIQUE (workspace_id, live_user_id)
);
CREATE TABLE IF NOT EXISTS clara_registry_project_links (
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  live_project_id TEXT NOT NULL CHECK (length(live_project_id) BETWEEN 1 AND 160),
  live_user_id TEXT NOT NULL,
  os_user_id TEXT NOT NULL,
  proof_id TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (workspace_id, project_id),
  -- A Live project cannot silently be assigned to a second OS project/client.
  UNIQUE (workspace_id, live_project_id),
  FOREIGN KEY (workspace_id, project_id, client_id)
    REFERENCES clara_registry_projects(workspace_id, id, client_id),
  FOREIGN KEY (workspace_id, os_user_id)
    REFERENCES clara_registry_identity_links(workspace_id, os_user_id)
);
CREATE TABLE IF NOT EXISTS clara_registry_link_challenges (
  id TEXT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  session_hash CHAR(64) NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
  os_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
  kind TEXT NOT NULL CHECK (kind IN ('identity','project')),
  project_id TEXT,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  consumed_at TIMESTAMPTZ,
  proof_id TEXT,
  live_user_id TEXT,
  live_project_id TEXT,
  CHECK ((kind='identity' AND project_id IS NULL AND client_id IS NULL)
      OR (kind='project' AND project_id IS NOT NULL AND client_id IS NOT NULL)),
  FOREIGN KEY (workspace_id, project_id, client_id)
    REFERENCES clara_registry_projects(workspace_id, id, client_id),
  CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '5 minutes')
);
CREATE TABLE IF NOT EXISTS clara_registry_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
  actor_user_id TEXT NOT NULL REFERENCES clara_auth_users(id),
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS clara_registry_audit_scope_idx ON clara_registry_audit(workspace_id,id);

-- Every command is a single transaction via a single SQL statement. Invoker
-- privileges only: this is not an elevation boundary or a public database RPC.
CREATE OR REPLACE FUNCTION clara_registry_command(
  session_digest TEXT, workspace TEXT, operation TEXT, payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  actor TEXT;
  actor_role TEXT;
  target TEXT;
  client TEXT;
  target_user TEXT;
  result JSONB;
  existing JSONB;
  ch clara_registry_link_challenges%ROWTYPE;
  identity clara_registry_identity_links%ROWTYPE;
BEGIN
  -- Lock the existing session/membership for this transaction. No new auth,
  -- default workspace or caller-supplied principal is accepted.
  SELECT s.user_id,m.role INTO actor,actor_role
  FROM clara_auth_sessions s JOIN clara_workspace_memberships m ON m.user_id=s.user_id
  WHERE s.token_hash=session_digest AND s.revoked_at IS NULL AND s.expires_at>NOW()
    AND m.workspace_id=workspace AND m.revoked_at IS NULL AND workspace<>'default'
    AND EXISTS (SELECT 1 FROM clara_auth_identities i WHERE i.user_id=s.user_id)
  FOR UPDATE OF s,m;
  IF actor IS NULL THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  -- Serialize only the new registry's commands in this workspace, including
  -- ACL revocations and challenge approval. Never mutate the auth workspace.
  PERFORM 1 FROM clara_auth_workspaces WHERE id=workspace FOR UPDATE;

  IF operation='list' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'id'),'[]') INTO result FROM (
      SELECT jsonb_build_object('id',c.id,'displayName',c.display_name,
        'projects',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'displayName',p.display_name,
          'liveProjectId',CASE WHEN l.revoked_at IS NULL AND il.revoked_at IS NULL THEN l.live_project_id END)
          ORDER BY p.id) FROM (SELECT * FROM clara_registry_projects WHERE workspace_id=workspace AND client_id=c.id ORDER BY id LIMIT 100) p
          JOIN clara_registry_project_access pa ON pa.workspace_id=p.workspace_id AND pa.project_id=p.id
            AND pa.user_id=actor AND pa.can_read AND pa.revoked_at IS NULL
          LEFT JOIN clara_registry_project_links l ON l.workspace_id=p.workspace_id AND l.project_id=p.id
          LEFT JOIN clara_registry_identity_links il ON il.workspace_id=l.workspace_id AND il.os_user_id=l.os_user_id
          WHERE p.workspace_id=workspace AND p.client_id=c.id AND p.revoked_at IS NULL),'[]')) AS row_data
      FROM clara_registry_clients c JOIN clara_registry_client_access ca
        ON ca.workspace_id=c.workspace_id AND ca.client_id=c.id AND ca.user_id=actor
      WHERE c.workspace_id=workspace AND c.revoked_at IS NULL AND ca.can_read AND ca.revoked_at IS NULL
        AND c.id>COALESCE(payload->>'after','')
      ORDER BY c.id LIMIT LEAST(100,GREATEST(1,COALESCE((payload->>'limit')::int,50)))
    ) rows;
    RETURN result;
  END IF;

  IF operation='listProjects' THEN
    SELECT COALESCE(jsonb_agg(row_data ORDER BY row_data->>'id'),'[]') INTO result FROM (
      SELECT jsonb_build_object('id',p.id,'displayName',p.display_name,
        'liveProjectId',CASE WHEN l.revoked_at IS NULL AND il.revoked_at IS NULL THEN l.live_project_id END) AS row_data
      FROM clara_registry_projects p
      JOIN clara_registry_clients c ON c.workspace_id=p.workspace_id AND c.id=p.client_id
      JOIN clara_registry_client_access ca ON ca.workspace_id=c.workspace_id AND ca.client_id=c.id AND ca.user_id=actor
      JOIN clara_registry_project_access pa ON pa.workspace_id=p.workspace_id AND pa.project_id=p.id AND pa.user_id=actor
      LEFT JOIN clara_registry_project_links l ON l.workspace_id=p.workspace_id AND l.project_id=p.id
      LEFT JOIN clara_registry_identity_links il ON il.workspace_id=l.workspace_id AND il.os_user_id=l.os_user_id
      WHERE p.workspace_id=workspace AND p.client_id=payload->>'clientId' AND p.id>COALESCE(payload->>'after','')
        AND p.revoked_at IS NULL AND c.revoked_at IS NULL AND pa.revoked_at IS NULL AND ca.revoked_at IS NULL AND ca.can_read AND pa.can_read
      ORDER BY p.id LIMIT LEAST(100,GREATEST(1,COALESCE((payload->>'limit')::int,50)))
    ) rows;
    RETURN result;
  END IF;

  IF operation='createClient' THEN
    IF actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    target:=payload->>'id';
    SELECT jsonb_build_object('displayName',display_name,'revoked',revoked_at IS NOT NULL) INTO existing
      FROM clara_registry_clients WHERE workspace_id=workspace AND id=target;
    IF existing IS NOT NULL THEN
      IF existing->>'displayName'<>payload->>'displayName' OR (existing->>'revoked')::boolean
        THEN RAISE EXCEPTION 'REGISTRY_CONFLICT' USING ERRCODE='23505'; END IF;
      RETURN jsonb_build_object('id',target,'replayed',true);
    END IF;
    INSERT INTO clara_registry_clients(workspace_id,id,display_name,created_by)
      VALUES(workspace,target,payload->>'displayName',actor);
    INSERT INTO clara_registry_client_access VALUES(workspace,target,actor,true,true,true,NULL);
    result:=jsonb_build_object('id',target);

  ELSIF operation IN ('createProject','grantClient','grantProject','revokeClient','revokeProject','beginProjectLink','revokeProjectLink') THEN
    client:=payload->>'clientId'; target:=payload->>'projectId';
    IF NOT EXISTS(SELECT 1 FROM clara_registry_clients c JOIN clara_registry_client_access a
      ON a.workspace_id=c.workspace_id AND a.client_id=c.id AND a.user_id=actor
      WHERE c.workspace_id=workspace AND c.id=client AND c.revoked_at IS NULL
        AND a.can_manage AND a.revoked_at IS NULL)
      THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF operation NOT IN ('createProject','grantClient','revokeClient') AND NOT EXISTS (
      SELECT 1 FROM clara_registry_projects p JOIN clara_registry_project_access a
      ON a.workspace_id=p.workspace_id AND a.project_id=p.id AND a.user_id=actor
      WHERE p.workspace_id=workspace AND p.id=target AND p.client_id=client AND p.revoked_at IS NULL
        AND a.can_manage AND a.revoked_at IS NULL)
      THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;

    IF operation='createProject' THEN
      SELECT jsonb_build_object('clientId',client_id,'displayName',display_name,'revoked',revoked_at IS NOT NULL)
        INTO existing FROM clara_registry_projects WHERE workspace_id=workspace AND id=target;
      IF existing IS NOT NULL THEN
        IF existing->>'clientId'<>client OR existing->>'displayName'<>payload->>'displayName'
          OR (existing->>'revoked')::boolean THEN RAISE EXCEPTION 'REGISTRY_CONFLICT' USING ERRCODE='23505'; END IF;
        RETURN jsonb_build_object('id',target,'replayed',true);
      END IF;
      INSERT INTO clara_registry_projects VALUES(workspace,target,client,payload->>'displayName',actor,NOW(),NULL);
      INSERT INTO clara_registry_project_access VALUES(workspace,target,actor,true,true,true,NULL);
      result:=jsonb_build_object('id',target);
    ELSIF operation IN ('grantClient','grantProject') THEN
      IF actor_role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
      target_user:=payload->>'userId';
      IF NOT EXISTS(SELECT 1 FROM clara_workspace_memberships m WHERE m.workspace_id=workspace
        AND m.user_id=target_user AND m.revoked_at IS NULL
        AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=target_user))
        THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
      IF operation='grantClient' THEN
        INSERT INTO clara_registry_client_access VALUES(workspace,client,target_user,
          (payload->>'read')::boolean,(payload->>'archive')::boolean,(payload->>'manage')::boolean,NULL)
        ON CONFLICT(workspace_id,client_id,user_id) DO UPDATE SET
          can_read=EXCLUDED.can_read,can_archive=EXCLUDED.can_archive,can_manage=EXCLUDED.can_manage,revoked_at=NULL;
        target:=client;
      ELSE
        INSERT INTO clara_registry_project_access VALUES(workspace,target,target_user,
          (payload->>'read')::boolean,(payload->>'archive')::boolean,(payload->>'manage')::boolean,NULL)
        ON CONFLICT(workspace_id,project_id,user_id) DO UPDATE SET
          can_read=EXCLUDED.can_read,can_archive=EXCLUDED.can_archive,can_manage=EXCLUDED.can_manage,revoked_at=NULL;
      END IF;
      result:=jsonb_build_object('id',target);
    ELSIF operation='revokeClient' THEN
      UPDATE clara_registry_clients SET revoked_at=COALESCE(revoked_at,NOW()) WHERE workspace_id=workspace AND id=client;
      target:=client; result:=jsonb_build_object('revoked',true);
    ELSIF operation='revokeProject' THEN
      UPDATE clara_registry_projects SET revoked_at=COALESCE(revoked_at,NOW()) WHERE workspace_id=workspace AND id=target;
      result:=jsonb_build_object('revoked',true);
    ELSIF operation='revokeProjectLink' THEN
      UPDATE clara_registry_project_links SET revoked_at=COALESCE(revoked_at,NOW()) WHERE workspace_id=workspace AND project_id=target;
      result:=jsonb_build_object('revoked',true);
    ELSE
      SELECT * INTO identity FROM clara_registry_identity_links
        WHERE workspace_id=workspace AND os_user_id=actor AND revoked_at IS NULL;
      IF identity.os_user_id IS NULL THEN RAISE EXCEPTION 'IDENTITY_LINK_REQUIRED' USING ERRCODE='42501'; END IF;
      INSERT INTO clara_registry_link_challenges(id,token_hash,session_hash,workspace_id,os_user_id,kind,project_id,client_id)
        VALUES(payload->>'id',payload->>'tokenHash',session_digest,workspace,actor,'project',target,client);
      target:=payload->>'id'; result:=jsonb_build_object('challengeId',target,'expiresIn',300);
    END IF;

  ELSIF operation='beginIdentityLink' THEN
    target:=payload->>'id';
    INSERT INTO clara_registry_link_challenges(id,token_hash,session_hash,workspace_id,os_user_id,kind)
      VALUES(target,payload->>'tokenHash',session_digest,workspace,actor,'identity');
    result:=jsonb_build_object('challengeId',target,'expiresIn',300);

  ELSIF operation IN ('challenge','confirmLink') THEN
    target:=payload->>'challengeId';
    SELECT * INTO ch FROM clara_registry_link_challenges
      WHERE id=target AND workspace_id=workspace AND os_user_id=actor AND session_hash=session_digest FOR UPDATE;
    IF ch.id IS NULL OR ch.expires_at<=NOW() THEN RAISE EXCEPTION 'CHALLENGE_UNAVAILABLE' USING ERRCODE='42501'; END IF;
    IF operation='challenge' THEN
      RETURN jsonb_build_object('id',ch.id,'kind',ch.kind,'tokenHash',ch.token_hash,'proofId',ch.proof_id,
        'liveUserId',ch.live_user_id,'liveProjectId',ch.live_project_id,'consumed',ch.consumed_at IS NOT NULL);
    END IF;
    IF ch.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'CHALLENGE_CONSUMED' USING ERRCODE='23505'; END IF;
    -- This payload is supplied only by the server's fresh Live proof fetch,
    -- never accepted from the browser's confirmation request.
    IF ch.proof_id IS NULL OR payload->>'proofId' IS DISTINCT FROM ch.proof_id
      OR payload->>'challengeHash' IS DISTINCT FROM ch.token_hash
      OR payload->>'liveUserId' IS DISTINCT FROM ch.live_user_id
      OR payload->>'kind' IS DISTINCT FROM ch.kind
      OR payload->>'liveProjectId' IS DISTINCT FROM ch.live_project_id
      OR payload->>'expiresAt' IS NULL OR payload->>'createdAt' IS NULL
      OR (payload->>'expiresAt')::timestamptz<=(payload->>'createdAt')::timestamptz
      OR (payload->>'expiresAt')::timestamptz<=NOW()
      OR (payload->>'createdAt')::timestamptz>NOW()+INTERVAL '5 seconds'
      OR (payload->>'expiresAt')::timestamptz>(payload->>'createdAt')::timestamptz+INTERVAL '5 minutes'
      THEN RAISE EXCEPTION 'PROOF_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF ch.kind='identity' THEN
      SELECT * INTO identity FROM clara_registry_identity_links WHERE workspace_id=workspace AND os_user_id=actor;
      IF identity.os_user_id IS NOT NULL AND identity.live_user_id<>ch.live_user_id
        THEN RAISE EXCEPTION 'IDENTITY_CONFLICT' USING ERRCODE='23505'; END IF;
      INSERT INTO clara_registry_identity_links VALUES(workspace,actor,ch.live_user_id,ch.proof_id,NOW(),NULL)
      ON CONFLICT(workspace_id,os_user_id) DO UPDATE SET proof_id=EXCLUDED.proof_id,approved_at=NOW(),revoked_at=NULL;
    ELSE
      SELECT * INTO identity FROM clara_registry_identity_links
        WHERE workspace_id=workspace AND os_user_id=actor AND revoked_at IS NULL AND live_user_id=ch.live_user_id;
      IF identity.os_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM clara_registry_projects p JOIN clara_registry_clients c ON c.workspace_id=p.workspace_id AND c.id=p.client_id
        JOIN clara_registry_project_access pa ON pa.workspace_id=p.workspace_id AND pa.project_id=p.id AND pa.user_id=actor
        JOIN clara_registry_client_access ca ON ca.workspace_id=c.workspace_id AND ca.client_id=c.id AND ca.user_id=actor
        WHERE p.workspace_id=workspace AND p.id=ch.project_id AND p.client_id=ch.client_id
          AND p.revoked_at IS NULL AND c.revoked_at IS NULL AND pa.revoked_at IS NULL AND ca.revoked_at IS NULL
          AND pa.can_manage AND ca.can_manage)
        THEN RAISE EXCEPTION 'REGISTRY_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
      IF ch.live_project_id IS NULL THEN RAISE EXCEPTION 'PROOF_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
      SELECT jsonb_build_object('liveProjectId',live_project_id,'liveUserId',live_user_id,'osUserId',os_user_id)
        INTO existing FROM clara_registry_project_links WHERE workspace_id=workspace AND project_id=ch.project_id;
      IF existing IS NOT NULL AND (existing->>'liveProjectId'<>ch.live_project_id
        OR existing->>'liveUserId'<>ch.live_user_id OR existing->>'osUserId'<>actor)
        THEN RAISE EXCEPTION 'PROJECT_LINK_CONFLICT' USING ERRCODE='23505'; END IF;
      INSERT INTO clara_registry_project_links VALUES(workspace,ch.project_id,ch.client_id,ch.live_project_id,ch.live_user_id,actor,ch.proof_id,NOW(),NULL)
      ON CONFLICT(workspace_id,project_id) DO UPDATE SET proof_id=EXCLUDED.proof_id,approved_at=NOW(),revoked_at=NULL;
    END IF;
    UPDATE clara_registry_link_challenges SET consumed_at=NOW() WHERE id=ch.id;
    result:=jsonb_build_object('linked',true);

  ELSIF operation='revokeIdentityLink' THEN
    target:=actor;
    UPDATE clara_registry_identity_links SET revoked_at=COALESCE(revoked_at,NOW()) WHERE workspace_id=workspace AND os_user_id=actor;
    -- Revoked project associations must be explicitly re-approved too. Re-linking
    -- an account alone must not silently reactivate old project permissions.
    UPDATE clara_registry_project_links SET revoked_at=COALESCE(revoked_at,NOW()) WHERE workspace_id=workspace AND os_user_id=actor;
    UPDATE clara_registry_link_challenges SET consumed_at=COALESCE(consumed_at,NOW())
      WHERE workspace_id=workspace AND os_user_id=actor;
    result:=jsonb_build_object('revoked',true);
  ELSE
    RAISE EXCEPTION 'UNKNOWN_REGISTRY_COMMAND' USING ERRCODE='22023';
  END IF;
  INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
    VALUES(workspace,actor,operation,target,jsonb_build_object('clientId',client,'grantee',target_user));
  RETURN result;
END $$;

-- Product transport can only inspect/propose within a high-entropy challenge
-- initiated by an independently verified OS session. It cannot activate a link.
CREATE OR REPLACE FUNCTION clara_registry_pending(
  workspace TEXT, challenge_digest TEXT, operation TEXT, payload JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE ch clara_registry_link_challenges%ROWTYPE;
BEGIN
  SELECT c.* INTO ch FROM clara_registry_link_challenges c
    JOIN clara_auth_sessions s ON s.token_hash=c.session_hash AND s.user_id=c.os_user_id
    JOIN clara_workspace_memberships m ON m.workspace_id=c.workspace_id AND m.user_id=c.os_user_id
    WHERE c.workspace_id=workspace AND c.token_hash=challenge_digest AND c.consumed_at IS NULL AND c.expires_at>NOW()
      AND s.revoked_at IS NULL AND s.expires_at>NOW() AND m.revoked_at IS NULL
      AND EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=c.os_user_id)
    FOR UPDATE OF c,s,m;
  IF ch.id IS NULL THEN RAISE EXCEPTION 'CHALLENGE_UNAVAILABLE' USING ERRCODE='42501'; END IF;
  IF operation='propose' THEN
    IF payload->>'kind' IS DISTINCT FROM ch.kind OR NOT(COALESCE(length(payload->>'liveUserId'),0) BETWEEN 1 AND 160)
      OR NOT(COALESCE(length(payload->>'proofId'),0) BETWEEN 1 AND 160)
      OR (ch.kind='identity' AND payload->>'liveProjectId' IS NOT NULL)
      OR (ch.kind='project' AND NOT(COALESCE(length(payload->>'liveProjectId'),0) BETWEEN 1 AND 160))
      THEN RAISE EXCEPTION 'PROOF_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
    IF ch.proof_id IS NOT NULL AND (ch.proof_id<>payload->>'proofId'
      OR ch.live_user_id<>payload->>'liveUserId' OR ch.live_project_id IS DISTINCT FROM payload->>'liveProjectId')
      THEN RAISE EXCEPTION 'PROOF_CONFLICT' USING ERRCODE='23505'; END IF;
    UPDATE clara_registry_link_challenges SET proof_id=payload->>'proofId',live_user_id=payload->>'liveUserId',
      live_project_id=payload->>'liveProjectId' WHERE id=ch.id;
    INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
      VALUES(workspace,ch.os_user_id,'proofProposed',ch.id,jsonb_build_object('proofId',payload->>'proofId'));
  ELSIF operation<>'inspect' THEN RAISE EXCEPTION 'UNKNOWN_REGISTRY_COMMAND' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('challengeId',ch.id,'kind',ch.kind,'osUserId',ch.os_user_id,'workspaceId',workspace,
    'clientId',ch.client_id,'projectId',ch.project_id,'expiresAt',ch.expires_at,
    'clientName',(SELECT display_name FROM clara_registry_clients WHERE workspace_id=workspace AND id=ch.client_id),
    'projectName',(SELECT display_name FROM clara_registry_projects WHERE workspace_id=workspace AND id=ch.project_id));
END $$;

-- No public/sessionless role may invoke these SQL functions directly. The
-- application DB owner calls them behind the reviewed HTTP/session boundaries.
REVOKE ALL ON FUNCTION clara_registry_command(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_pending(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
