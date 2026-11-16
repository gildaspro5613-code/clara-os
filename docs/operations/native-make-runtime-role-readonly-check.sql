-- CLARA OS / PR #249 — SQL ROLE RECEPTION (READ ONLY)
-- Run from the exact CLARA OS recette DATABASE_URL/POSTGRES_URL connection.
-- Never log connection strings, passwords, OAuth cookies, session digests or tokens.
-- This query does not mutate the database or create roles.
-- Expected: a purpose-limited application role, not neondb_owner/neon_service.
-- The PR now proposes a scoped SECURITY DEFINER read resolver, rather than
-- granting direct SELECT on connections or grants to the runtime.
-- Do not run this reception gate against Production until migrations are approved.
SELECT current_user::text AS runtime_role,
       current_database()::text AS runtime_database,
       has_function_privilege(current_user,
         'public.clara_native_make_admin_command(text,text,text,text,text,text,jsonb)',
         'EXECUTE') AS can_execute_admin,
       to_regprocedure('public.clara_native_make_read_resolve(text,text,text,text,text,text)') IS NOT NULL
         AS read_resolver_installed,
       CASE WHEN to_regprocedure('public.clara_native_make_read_resolve(text,text,text,text,text,text)') IS NULL
         THEN FALSE
         ELSE has_function_privilege(current_user,
             'public.clara_native_make_read_resolve(text,text,text,text,text,text)', 'EXECUTE')
       END AS can_execute_read_resolver,
       has_table_privilege(current_user, 'public.clara_native_make_read_authority', 'INSERT') AS can_insert_grant,
       has_table_privilege(current_user, 'public.clara_native_make_read_authority', 'UPDATE') AS can_update_grant,
       has_table_privilege(current_user, 'public.clara_native_make_scenario_catalog', 'UPDATE') AS can_update_catalog,
       has_table_privilege(current_user, 'public.clara_connections', 'SELECT') AS can_read_all_connections,
       has_table_privilege(current_user, 'public.clara_native_make_admin_audit', 'INSERT') AS can_insert_audit;
-- GO only if role is a scoped non-owner LOGIN identity, both function calls
-- are permitted and all direct table permissions above are FALSE.
-- An active real Clara session and explicit Make authorization are separate tests.
