/** Validate effective database binding before any SQL query is allowed. */
export function validateRecetteDatabaseBinding(env: NodeJS.ProcessEnv): 'FAIL' | 'NON ATTESTÉ' | 'OK' {
  if (env.VERCEL_ENV === 'production' ||
      env.VERCEL_TARGET_ENV !== 'clara-os-recette' ||
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
      !url.password || url.hash !== '' || (url.port !== '' && url.port !== '5432') ||
      url.searchParams.getAll('sslmode').length !== 1 ||
      url.searchParams.get('sslmode') !== 'require' ||
      [...url.searchParams.keys()].some(k => !['sslmode', 'channel_binding'].includes(k)) ||
      (url.searchParams.has('channel_binding') &&
       (url.searchParams.getAll('channel_binding').length !== 1 ||
        url.searchParams.get('channel_binding') !== 'require'))) return 'FAIL';
  return 'OK';
}
