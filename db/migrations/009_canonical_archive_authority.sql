-- Additive, no data conversion. Archive references remain administrative only.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_live_archive_references (
 workspace_id TEXT NOT NULL, client_id TEXT NOT NULL, live_project_id TEXT NOT NULL,
 project_id TEXT NOT NULL, archive_record JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(workspace_id,client_id,live_project_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS clara_live_archive_project_identity
 ON clara_live_archive_references(workspace_id,live_project_id);
CREATE TABLE IF NOT EXISTS clara_registry_authority_tickets (
 token_hash CHAR(64) PRIMARY KEY CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 session_hash CHAR(64) NOT NULL, workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id),
 client_id TEXT NOT NULL, project_id TEXT NOT NULL, operation TEXT NOT NULL CHECK(operation IN ('read','archive')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL,
 CHECK(expires_at>created_at AND expires_at<=created_at+INTERVAL '60 seconds'),
 FOREIGN KEY(workspace_id,project_id,client_id) REFERENCES clara_registry_projects(workspace_id,id,client_id)
);
CREATE OR REPLACE FUNCTION clara_registry_authority(session_digest TEXT,workspace TEXT,client TEXT,project TEXT,op TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE scope JSONB;
BEGIN
 IF op NOT IN ('read','archive') THEN RAISE EXCEPTION 'INVALID_OPERATION' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('osUserId',s.user_id,'workspaceId',workspace,'clientId',client,'projectId',project,
   'clientName',c.display_name,'projectName',p.display_name,'liveUserId',i.live_user_id,'liveProjectId',l.live_project_id,
   'identityProofId',i.proof_id,'projectProofId',l.proof_id,'operation',op,'canArchive',ca.can_archive AND pa.can_archive)
 INTO scope FROM clara_auth_sessions s
 JOIN clara_workspace_memberships m ON m.user_id=s.user_id AND m.workspace_id=workspace
 JOIN clara_registry_identity_links i ON i.os_user_id=s.user_id AND i.workspace_id=workspace
 JOIN clara_registry_project_links l ON l.workspace_id=workspace AND l.project_id=project AND l.client_id=client
   AND l.live_user_id=i.live_user_id AND l.os_user_id=s.user_id
 JOIN clara_registry_clients c ON c.workspace_id=workspace AND c.id=client
 JOIN clara_registry_projects p ON p.workspace_id=workspace AND p.id=project AND p.client_id=client
 JOIN clara_registry_client_access ca ON ca.workspace_id=workspace AND ca.client_id=client AND ca.user_id=s.user_id
 JOIN clara_registry_project_access pa ON pa.workspace_id=workspace AND pa.project_id=project AND pa.user_id=s.user_id
 WHERE s.token_hash=session_digest AND s.revoked_at IS NULL AND s.expires_at>NOW() AND m.revoked_at IS NULL
 AND EXISTS(SELECT 1 FROM clara_auth_identities ai WHERE ai.user_id=s.user_id)
 AND i.revoked_at IS NULL AND l.revoked_at IS NULL AND c.revoked_at IS NULL AND p.revoked_at IS NULL
 AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL AND ca.can_read AND pa.can_read
 AND (op='read' OR (ca.can_archive AND pa.can_archive))
 FOR UPDATE OF s,m,c,p,i,l,ca,pa;
 IF scope IS NULL THEN RAISE EXCEPTION 'ARCHIVE_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 RETURN scope;
END $$;
CREATE OR REPLACE FUNCTION clara_registry_ticket(session_digest TEXT,workspace TEXT,client TEXT,project TEXT,op TEXT,digest TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE scope JSONB;
BEGIN
 PERFORM 1 FROM clara_auth_workspaces WHERE id=workspace FOR UPDATE;
 scope:=clara_registry_authority(session_digest,workspace,client,project,op);
 INSERT INTO clara_registry_authority_tickets(token_hash,session_hash,workspace_id,client_id,project_id,operation,expires_at)
 VALUES(digest,session_digest,workspace,client,project,op,NOW()+INTERVAL '45 seconds');
 RETURN scope;
END $$;
CREATE OR REPLACE FUNCTION clara_registry_redeem(workspace TEXT,digest TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE t clara_registry_authority_tickets%ROWTYPE;
BEGIN
 PERFORM 1 FROM clara_auth_workspaces WHERE id=workspace FOR UPDATE;
 SELECT * INTO t FROM clara_registry_authority_tickets WHERE token_hash=digest AND workspace_id=workspace AND expires_at>NOW();
 IF t.token_hash IS NULL THEN RAISE EXCEPTION 'TICKET_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 RETURN clara_registry_authority(t.session_hash,workspace,t.client_id,t.project_id,t.operation)
   ||jsonb_build_object('expiresAt',t.expires_at);
END $$;
CREATE OR REPLACE FUNCTION clara_registry_archive_commit(session_digest TEXT,workspace TEXT,digest TEXT,record JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE scope JSONB; t clara_registry_authority_tickets%ROWTYPE; prior JSONB;
BEGIN
 PERFORM 1 FROM clara_auth_workspaces WHERE id=workspace FOR UPDATE;
 SELECT * INTO t FROM clara_registry_authority_tickets WHERE token_hash=digest AND session_hash=session_digest
  AND workspace_id=workspace AND operation='archive' AND expires_at>NOW();
 IF t.token_hash IS NULL THEN RAISE EXCEPTION 'TICKET_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 scope:=clara_registry_authority(session_digest,workspace,t.client_id,t.project_id,'archive');
 IF record->>'workspaceId' IS DISTINCT FROM workspace OR record->>'clientId' IS DISTINCT FROM scope->>'clientId'
 OR record->>'projectId' IS DISTINCT FROM scope->>'projectId' OR record->>'liveProjectId' IS DISTINCT FROM scope->>'liveProjectId'
 OR record->>'displayName' IS DISTINCT FROM scope->>'projectName'
 OR record->>'version' IS DISTINCT FROM 'clara.live-archive-reference.v1'
 OR record->>'productId' IS DISTINCT FROM 'clara-live' OR record->>'status' IS DISTINCT FROM 'archived'
 THEN RAISE EXCEPTION 'ARCHIVE_SCOPE_MISMATCH' USING ERRCODE='42501'; END IF;
 -- Immutable history: replay returns the original reference even after reopening
 -- and subsequent re-closing. Canonical association cannot change through this API.
 INSERT INTO clara_live_archive_references(workspace_id,client_id,live_project_id,project_id,archive_record)
 VALUES(workspace,t.client_id,scope->>'liveProjectId',t.project_id,record)
 ON CONFLICT(workspace_id,client_id,live_project_id) DO NOTHING;
 SELECT archive_record INTO prior FROM clara_live_archive_references
 WHERE workspace_id=workspace AND client_id=t.client_id AND live_project_id=scope->>'liveProjectId' AND project_id=t.project_id;
 IF prior IS NULL THEN RAISE EXCEPTION 'ARCHIVE_CONFLICT' USING ERRCODE='23505'; END IF;
 INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
 VALUES(workspace,scope->>'osUserId','archiveReference',t.project_id,jsonb_build_object('liveProjectId',scope->>'liveProjectId'));
 DELETE FROM clara_registry_authority_tickets WHERE token_hash=digest;
 RETURN prior;
END $$;
REVOKE ALL ON FUNCTION clara_registry_authority(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_ticket(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_redeem(TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_archive_commit(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
COMMIT;
