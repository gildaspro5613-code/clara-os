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
  if (!host || !/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(host) ||
      env.CLARA_RECETTE_NEON_BRANCH_ID !== 'br-crimson-feather-b2zr00sf' || env.POSTGRES_URL)
    throw Error('RECETTE_DATABASE_REFUSED');
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ''); } catch { throw Error('RECETTE_DATABASE_REFUSED'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== host ||
      url.username !== 'clara_os_recette_limited' || url.pathname !== '/neondb' ||
      !url.password || url.hash || url.searchParams.getAll('sslmode').length !== 1 ||
      url.searchParams.get('sslmode') !== 'require' || url.port && url.port !== '5432' ||
      [...url.searchParams.keys()].some(key => !['sslmode','channel_binding'].includes(key)) ||
      url.searchParams.has('channel_binding') &&
        (url.searchParams.getAll('channel_binding').length !== 1 || url.searchParams.get('channel_binding') !== 'require'))
    throw Error('RECETTE_DATABASE_REFUSED');
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
