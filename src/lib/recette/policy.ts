import { refuseRecetteDatabase } from './diagnostics';
/** Server-only policy. Custom targets are not VERCEL_ENV=production. */
export function recetteRequested(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_TARGET_ENV === 'clara-os-recette' || env.CLARA_RECETTE_MODE !== undefined ||
    // A Vercel non-production process without custom-target metadata must not
    // silently inherit live transports when the recette flag was omitted.
    (env.VERCEL === '1' && env.VERCEL_ENV !== 'production');
}
export function recetteDatabase(env: NodeJS.ProcessEnv = process.env): URL {
  if (env.VERCEL_ENV === 'production' || env.VERCEL_TARGET_ENV !== 'clara-os-recette' ||
      env.CLARA_RECETTE_MODE !== 'isolated-v1' || env.VERCEL !== '1')
    throw Error('RECETTE_CONFIGURATION_REFUSED');
  const host = env.CLARA_RECETTE_NEON_HOST;
  if (!host) refuseRecetteDatabase('HOST_MISSING');
  if (!/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(host)) refuseRecetteDatabase('HOST_INVALID');
  if (env.CLARA_RECETTE_NEON_BRANCH_ID !== 'br-crimson-feather-b2zr00sf') refuseRecetteDatabase('BRANCH_MISMATCH');
  if (env.POSTGRES_URL) refuseRecetteDatabase('POSTGRES_URL_PRESENT');
  if (!env.DATABASE_URL) refuseRecetteDatabase('DATABASE_URL_MISSING');
  let url: URL;
  try { url = new URL(env.DATABASE_URL); } catch { return refuseRecetteDatabase('DATABASE_URL_INVALID'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) refuseRecetteDatabase('PROTOCOL_INVALID');
  if (url.hostname !== host) refuseRecetteDatabase('HOST_MISMATCH');
  if (url.username !== 'clara_os_recette_limited') refuseRecetteDatabase('ROLE_MISMATCH');
  if (url.pathname !== '/neondb') refuseRecetteDatabase('NAME_MISMATCH');
  if (!url.password) refuseRecetteDatabase('PASSWORD_MISSING');
  if (url.hash) refuseRecetteDatabase('FRAGMENT_FORBIDDEN');
  if (url.searchParams.getAll('sslmode').length !== 1) refuseRecetteDatabase('SSL_MODE_COUNT_INVALID');
  if (url.searchParams.get('sslmode') !== 'require') refuseRecetteDatabase('SSL_MODE_INVALID');
  if (url.port && url.port !== '5432') refuseRecetteDatabase('PORT_INVALID');
  if ([...url.searchParams.keys()].some(key => !['sslmode','channel_binding'].includes(key))) refuseRecetteDatabase('QUERY_KEY_FORBIDDEN');
  if (url.searchParams.has('channel_binding')) {
    if (url.searchParams.getAll('channel_binding').length !== 1) refuseRecetteDatabase('CHANNEL_BINDING_COUNT_INVALID');
    if (url.searchParams.get('channel_binding') !== 'require') refuseRecetteDatabase('CHANNEL_BINDING_INVALID');
  }
  return url;
}
export function refuseRecetteExternal(): void {
  if (recetteRequested()) throw Error('RECETTE_EXTERNAL_OPERATION_BLOCKED');
}
export function configureRecetteOrigin(): void {
  const host = process.env.VERCEL_URL;
  if (!host || !/^[a-z0-9-]+\.vercel\.app$/.test(host)) throw Error('RECETTE_ORIGIN_REFUSED');
  const origin = `https://${host}`;
  if (process.env.CLARA_AUTH_APP_ORIGIN && process.env.CLARA_AUTH_APP_ORIGIN !== origin)
    throw Error('RECETTE_ORIGIN_REFUSED');
  // Canonical generated deployment URL only: never trust forwarded headers or
  // inherit the production callback origin in a recette process.
  process.env.CLARA_AUTH_APP_ORIGIN = origin;
}
