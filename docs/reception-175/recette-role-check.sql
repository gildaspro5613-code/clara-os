-- Prepared only. Run on br-crimson-feather-b2zr00sf using the limited app role.
-- No secret, no DDL, no GRANT and no business content in these results.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT current_database(), current_user;
SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication
FROM pg_roles WHERE rolname='clara_os_recette_limited';
SELECT has_database_privilege(current_user,current_database(),'CONNECT') AS connect,
 has_schema_privilege(current_user,'public','USAGE') AS usage,
 has_schema_privilege(current_user,'public','CREATE') AS schema_create;
SELECT c.relname,
 has_table_privilege(current_user,c.oid,'SELECT') AS app_select,
 has_table_privilege(current_user,c.oid,'INSERT') AS app_insert,
 has_table_privilege(current_user,c.oid,'UPDATE') AS app_update,
 has_table_privilege(current_user,c.oid,'DELETE') AS app_delete
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND left(c.relname,6)='clara_'
ORDER BY c.relname;
SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS signature,
 has_function_privilege(current_user,p.oid,'EXECUTE') AS app_execute,p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND (left(p.proname,13)='clara_native_' OR left(p.proname,15)='clara_registry_')
ORDER BY p.proname;
SELECT has_column_privilege(current_user,
 'public.clara_native_google_oauth_transactions','requested_scopes','SELECT') AS scope_select,
 has_column_privilege(current_user,
 'public.clara_native_google_oauth_transactions','requested_scopes','INSERT') AS scope_insert;
ROLLBACK;
