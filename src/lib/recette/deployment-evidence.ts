import 'server-only';
import { neon } from '@neondatabase/serverless';

import { validateRecetteDatabaseBinding } from './database-binding';
export { validateRecetteDatabaseBinding } from './database-binding';

/**
 * Read-only, in-process evidence collector for the *current* deployment.
 * Not an HTTP route. No control-plane tokens are required or accepted.
 * A valid SQL role alone cannot prove a Neon branch: this collector NEVER returns PASS.
 */
export async function collectRecetteDeploymentEvidence(
  env: NodeJS.ProcessEnv = process.env,
): Promise<{status:'FAIL'|'NON ATTESTÉ';checks:string[];writesRequested:false}> {
  const checks: string[] = [];
  const unavailable = () => ({status:'NON ATTESTÉ' as const,checks,writesRequested:false as const});
  const refused = () => ({status:'FAIL' as const,checks,writesRequested:false as const});
  try {
    const binding = validateRecetteDatabaseBinding(env);
    if (binding === 'FAIL') return refused();
    if (binding === 'NON ATTESTÉ') return unavailable();
    checks.push('ISOLATION_CONFIGURATION');
    // Endpoint-to-branch provenance must be independently verified outside the app.
    const databaseUrl = env.DATABASE_URL;
    if (!databaseUrl) return unavailable();
    const sql = neon(databaseUrl, {fetchOptions:{redirect:'error',signal:AbortSignal.timeout(15000)}});
    const [rows] = await sql.transaction([sql`SELECT current_database() AS db,current_user AS role,
      rolsuper,rolbypassrls,rolcreatedb,rolcreaterole,rolreplication,
      has_schema_privilege(current_user,'public','CREATE') AS schema_create,
      has_database_privilege(current_user,current_database(),'CREATE') AS database_create
      FROM pg_roles WHERE rolname=current_user`], {readOnly:true});
    const role = rows[0];
    if (rows.length !== 1 || role.db !== 'neondb' || role.role !== 'clara_os_recette_limited' ||
        ['rolsuper','rolbypassrls','rolcreatedb','rolcreaterole','rolreplication','schema_create','database_create'].some(k => role[k] !== false)) return refused();
    checks.push('SQL_DATABASE_LIMITED_ROLE_NO_ADMIN');
    return unavailable();
  } catch {
    return unavailable();
  }
}
