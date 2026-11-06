-- CLARA OS / PR #249 — SQL ROLE RECEPTION (READ ONLY)
-- Run from the exact CLARA OS recette DATABASE_URL/POSTGRES_URL connection.
-- Never log connection strings, passwords, OAuth cookies, session digests or tokens.
-- This query does not mutate the database or create roles.
-- Expected: a purpose-limited application role, not neondb_owner/neon_service.
-- Runtime's resolver currently joins grants + catalog + connections directly;
-- lacking any of the three SELECT privileges means fail-closed READ and NO-GO.
-- NOTE: these are broad table SELECT requirements of the existing resolver;
-- before Production, assess a security-definer read resolver to avoid exposing
-- tables beyond the needed user/client/project scoped authorization view.
WITH caller AS (
  SELECT current_user::text AS runtime_role,
         current_database()::text AS runtime_database
),
perms AS (
  SELECT
    has_function_privilege(current_user,
      'public.clara_native_make_admin_command(text,text,text,text,text,text,jsonb)',
      'EXECUTE') AS can_call_admin_command,
    has_table_privilege(current_user,
      'public.clara_native_make_read_authority','SELECT') AS can_read_authority,
    has_table_privilege(current_user,
      'public.clara_native_make_scenario_catalog','SELECT') AS can_read_catalog,
    has_table_privilege(current_user,
      'public.clara_connections','SELECT') AS can_read_connections,
    has_table_privilege(current_user,
      'public.clara_native_make_read_authority','INSERT') AS can_insert_authority_directly,
    has_table_privilege(current_user,
      'public.clara_native_make_read_authority','UPDATE') AS can_update_authority_directly,
    has_table_privilege(current_user,
      'public.clara_native_make_scenario_catalog','UPDATE') AS can_update_catalog_directly,
    has_table_privilege(current_user,
      'public.clara_native_make_admin_audit','INSERT') AS can_insert_audit_directly
)
SELECT runtime_role,runtime_database,
       can_call_admin_command,can_read_authority,can_read_catalog,can_read_connections,
       can_insert_authority_directly,can_update_authority_directly,
       can_update_catalog_directly,can_insert_audit_directly,
       (runtime_role NOT IN ('neondb_owner','neon_service','cloud_admin')
        AND can_call_admin_command
        AND can_read_authority
        AND can_read_catalog
        AND can_read_connections
        AND NOT can_insert_authority_directly
        AND NOT can_update_authority_directly
        AND NOT can_update_catalog_directly
        AND NOT can_insert_audit_directly) AS role_reception_pass
FROM caller CROSS JOIN perms;
