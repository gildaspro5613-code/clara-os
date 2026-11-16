-- Lecture ciblée : aucun appel de fonction métier (qui pourrait prendre des verrous), aucun secret.
-- Compléter les NULL uniquement dans le canal administratif sécurisé avec le contexte EXACT
-- de la requête en échec. Ne pas chercher l'utilisateur par email ou choisir le dernier fil.
-- L'authentification de la session HTTP doit être attestée séparément par la requête native
-- authentifiée existante ; ce SELECT ne démontre pas la validité de son cookie.
BEGIN TRANSACTION READ ONLY;
WITH input AS (
 SELECT '79e1a131-966b-4be2-a9a6-3a9ba6009112'::text connection_id,
        NULL::text operator_user_id, NULL::text workspace_id,
        NULL::text client_id, NULL::text project_id, NULL::text native_session_id
), state AS (
 SELECT i.*,c.id IS NOT NULL connection_present,c.workspace_id connection_workspace,
        c.status,c.scopes,a.owner_user_id,a.issuer,a.subject,a.revoked_at,
        a.connection_id IS NOT NULL authority_present,a.workspace_id authority_workspace
 FROM input i LEFT JOIN clara_connections c ON c.id=i.connection_id AND c.provider='google'
 LEFT JOIN clara_native_google_authority a ON a.connection_id=i.connection_id
)
SELECT
 connection_present, status,
 authority_present, (authority_present AND revoked_at IS NULL) authority_active,
 EXISTS(SELECT 1 FROM clara_auth_identities k WHERE k.user_id=owner_user_id AND k.issuer=state.issuer AND k.subject=state.subject) owner_identity_matches,
 EXISTS(SELECT 1 FROM clara_workspace_memberships m WHERE m.user_id=owner_user_id AND m.workspace_id=authority_workspace AND m.revoked_at IS NULL) owner_membership_active,
 COALESCE(scopes ? 'https://www.googleapis.com/auth/drive.readonly' OR scopes ? 'https://www.googleapis.com/auth/drive',false) drive_read_scope,
 COALESCE(scopes ? 'https://www.googleapis.com/auth/calendar.calendarlist.readonly',false) calendar_list_scope,
 COALESCE(scopes ? 'https://www.googleapis.com/auth/calendar.events',false) calendar_events_scope,
 (operator_user_id IS NOT NULL AND workspace_id IS NOT NULL AND client_id IS NOT NULL AND project_id IS NOT NULL AND native_session_id IS NOT NULL) exact_context_supplied,
 CASE WHEN workspace_id IS NULL THEN NULL ELSE connection_workspace=workspace_id AND authority_workspace=workspace_id END same_workspace,
 CASE WHEN client_id IS NULL OR project_id IS NULL OR workspace_id IS NULL THEN NULL ELSE EXISTS(
   SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id
   WHERE ca.user_id=owner_user_id AND ca.workspace_id=state.workspace_id AND ca.client_id=state.client_id AND pa.project_id=state.project_id
     AND ca.can_read AND pa.can_read AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL
 ) END owner_reads_exact_context,
 CASE WHEN operator_user_id IS NULL OR workspace_id IS NULL OR client_id IS NULL OR project_id IS NULL THEN NULL ELSE
   operator_user_id=owner_user_id OR EXISTS(SELECT 1 FROM clara_native_google_delegations d WHERE d.connection_id=state.connection_id AND d.user_id=operator_user_id AND d.workspace_id=state.workspace_id AND d.client_id=state.client_id AND d.project_id=state.project_id AND d.revoked_at IS NULL)
 END caller_is_owner_or_exact_delegate,
 CASE WHEN operator_user_id IS NULL OR workspace_id IS NULL OR client_id IS NULL OR project_id IS NULL THEN NULL ELSE EXISTS(
   SELECT 1 FROM clara_registry_client_access ca JOIN clara_registry_project_access pa ON pa.workspace_id=ca.workspace_id AND pa.user_id=ca.user_id
   WHERE ca.user_id=operator_user_id AND ca.workspace_id=state.workspace_id AND ca.client_id=state.client_id AND pa.project_id=state.project_id
     AND ca.can_read AND pa.can_read AND ca.can_manage AND pa.can_manage AND ca.revoked_at IS NULL AND pa.revoked_at IS NULL
 ) END caller_can_select_in_exact_context,
 CASE WHEN operator_user_id IS NULL OR workspace_id IS NULL THEN NULL ELSE EXISTS(SELECT 1 FROM clara_workspace_memberships m WHERE m.user_id=operator_user_id AND m.workspace_id=state.workspace_id AND m.revoked_at IS NULL AND m.role IN ('owner','admin')) END caller_role_allows_consent,
 CASE WHEN native_session_id IS NULL OR operator_user_id IS NULL OR workspace_id IS NULL OR client_id IS NULL OR project_id IS NULL THEN NULL ELSE EXISTS(
   SELECT 1 FROM clara_native_resource_authority r JOIN clara_sessions ns ON ns.id=r.resource_id
   WHERE r.resource_kind='session' AND r.resource_id=native_session_id AND r.owner_user_id=operator_user_id
     AND r.workspace_id=state.workspace_id AND r.client_id=state.client_id AND r.project_id=state.project_id AND r.revoked_at IS NULL
     AND r.snapshot_sha256=encode(sha256(convert_to(ns.data::text,'UTF8')),'hex')
 ) END thread_binding_matches,
 COALESCE(position('NATIVE_GOOGLE_REAUTH_REQUIRED' IN pg_get_functiondef(to_regprocedure('clara_native_google_command(text,text,text,text,text,text,jsonb)')))>0,false) deployed_sql_has_reauth_refusal
FROM state;
ROLLBACK;
