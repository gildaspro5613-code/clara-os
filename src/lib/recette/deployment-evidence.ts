import 'server-only';
import { neon } from '@neondatabase/serverless';

/** Validate effective database binding before any SQL query is allowed. */
export function validateRecetteDatabaseBinding(env: NodeJS.ProcessEnv): 'FAIL' | 'NON ATTESTÉ' | 'OK' {
  if (env.VERCEL_ENV === 'production' ||
      env.VERCEL_PROJECT_ID !== 'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz' ||
      env.CLARA_RECETTE_MODE !== 'isolated-v1' ||
      env.CLARA_RECETTE_NEON_BRANCH_ID !== 'br-crimson-feather-b2zr00sf' ||
      env.POSTGRES_URL !== undefined) return 'FAIL';
  if (!env.DATABASE_URL || !env.CLARA_RECETTE_NEON_HOST) return 'NON ATTESTÉ';
  let url: URL;
  try { url = new URL(env.DATABASE_URL); } catch { return 'FAIL'; }
  if (!['postgres:','postgresql:'].includes(url.protocol) ||
      url.hostname !== env.CLARA_RECETTE_NEON_HOST ||
      !['ep-aged-forest-b2wayach.c-6.eu-central-1.aws.neon.tech',
        'ep-aged-forest-b2wayach-pooler.c-6.eu-central-1.aws.neon.tech'].includes(url.hostname) ||
      url.username !== 'clara_os_recette_limited' ||
      url.pathname !== '/neondb' ||
      !url.password ||
      url.searchParams.getAll('sslmode').length !== 1 ||
      url.searchParams.get('sslmode') !== 'require' ||
      [...url.searchParams.keys()].some(k => !['sslmode', 'channel_binding'].includes(k)) ||
      (url.searchParams.has('channel_binding') &&
       (url.searchParams.getAll('channel_binding').length !== 1 ||
        url.searchParams.get('channel_binding') !== 'require'))) return 'FAIL';
  return 'OK';
}

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
    const sql = neon(env.DATABASE_URL, {fetchOptions:{redirect:'error',signal:AbortSignal.timeout(15000)}});
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
