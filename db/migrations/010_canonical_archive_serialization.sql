-- Additive coordination: durable consumption/fencing, no project data conversion.
BEGIN;
CREATE TABLE IF NOT EXISTS clara_registry_archive_receipts (
 workspace_id TEXT NOT NULL REFERENCES clara_auth_workspaces(id), token_hash CHAR(64) NOT NULL,
 lifecycle_revision BIGINT NOT NULL CHECK(lifecycle_revision>0), live_project_id TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('committed','cancelled')), reference JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(workspace_id,token_hash)
);
CREATE OR REPLACE FUNCTION clara_registry_archive_write_internal(session_digest TEXT,workspace TEXT,digest TEXT,record JSONB)
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

-- Old local commit path cannot bypass the Live reservation protocol.
CREATE OR REPLACE FUNCTION clara_registry_archive_commit(session_digest TEXT,workspace TEXT,digest TEXT,record JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN RAISE EXCEPTION 'LIVE_RESERVATION_REQUIRED' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION clara_registry_archive_settle(workspace TEXT,digest TEXT,revision BIGINT,live_project TEXT,mode TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE t clara_registry_authority_tickets%ROWTYPE; r clara_registry_archive_receipts%ROWTYPE; scope JSONB; saved JSONB;
BEGIN
 PERFORM 1 FROM clara_auth_workspaces WHERE id=workspace FOR UPDATE;
 IF mode NOT IN ('commit','cancel') OR revision IS NULL OR revision<1 THEN
  RAISE EXCEPTION 'INVALID_SETTLEMENT' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM clara_registry_archive_receipts WHERE workspace_id=workspace AND token_hash=digest;
 IF r.token_hash IS NOT NULL THEN
  IF r.lifecycle_revision<>revision OR r.live_project_id<>live_project THEN
   RAISE EXCEPTION 'RECEIPT_SCOPE_MISMATCH' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('state',r.state,'lifecycleRevision',r.lifecycle_revision,'liveProjectId',r.live_project_id,'reference',r.reference);
 END IF;
 SELECT * INTO t FROM clara_registry_authority_tickets WHERE token_hash=digest AND workspace_id=workspace AND operation='archive';
 IF t.token_hash IS NULL THEN RAISE EXCEPTION 'TICKET_UNAVAILABLE' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM clara_registry_project_links WHERE workspace_id=workspace AND project_id=t.project_id AND live_project_id=live_project) THEN
  RAISE EXCEPTION 'PROJECT_SCOPE_MISMATCH' USING ERRCODE='42501'; END IF;
 IF mode='commit' THEN
  scope:=clara_registry_authority(t.session_hash,workspace,t.client_id,t.project_id,'archive');
  saved:=clara_registry_archive_write_internal(t.session_hash,workspace,digest,jsonb_build_object(
   'version','clara.live-archive-reference.v1','productId','clara-live','status','archived',
   'workspaceId',workspace,'clientId',t.client_id,'projectId',t.project_id,'liveProjectId',live_project,
   'displayName',scope->>'projectName','archivedAt',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
 END IF;
 -- Cancellation takes the SAME lock as commit and consumes the ticket. A delayed
 -- callback will see this durable fence, even after a timeout or process restart.
 DELETE FROM clara_registry_authority_tickets WHERE token_hash=digest;
 INSERT INTO clara_registry_archive_receipts(workspace_id,token_hash,lifecycle_revision,live_project_id,state,reference)
 VALUES(workspace,digest,revision,live_project,CASE WHEN mode='commit' THEN 'committed' ELSE 'cancelled' END,saved);
 INSERT INTO clara_registry_audit(workspace_id,actor_user_id,action,target_id,evidence)
 VALUES(workspace,(SELECT user_id FROM clara_auth_sessions WHERE token_hash=t.session_hash),'archiveSettlement',t.project_id,jsonb_build_object('lifecycleRevision',revision,'state',mode));
 RETURN jsonb_build_object('state',CASE WHEN mode='commit' THEN 'committed' ELSE 'cancelled' END,'lifecycleRevision',revision,'liveProjectId',live_project,'reference',saved);
END $$;
REVOKE ALL ON FUNCTION clara_registry_archive_write_internal(TEXT,TEXT,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION clara_registry_archive_settle(TEXT,TEXT,BIGINT,TEXT,TEXT) FROM PUBLIC;
COMMIT;
