const codes = [
  'HOST_MISSING','HOST_INVALID','BRANCH_MISMATCH','POSTGRES_URL_PRESENT',
  'DATABASE_URL_MISSING','DATABASE_URL_INVALID','PROTOCOL_INVALID','HOST_MISMATCH',
  'ROLE_MISMATCH','NAME_MISMATCH','PASSWORD_MISSING','FRAGMENT_FORBIDDEN',
  'SSL_MODE_COUNT_INVALID','SSL_MODE_INVALID','PORT_INVALID','QUERY_KEY_FORBIDDEN',
  'CHANNEL_BINDING_COUNT_INVALID','CHANNEL_BINDING_INVALID',
  'NEON_ENDPOINT_INVALID','NEON_ENDPOINT_PROTOCOL_INVALID',
  'NEON_ENDPOINT_HOST_INVALID','NEON_ENDPOINT_PATH_INVALID',
] as const;
type Refusal = typeof codes[number];
class DatabaseRefusal extends Error {
  declare readonly diagnostic: Refusal;
  constructor(code: Refusal) {
    super('RECETTE_DATABASE_REFUSED');
    // Keep public error messages, stack messages and JSON generic. Never attach
    // URL/parser errors or environment values, including as Error.cause.
    Object.defineProperty(this,'diagnostic',{value:code,enumerable:false});
  }
}
export function refuseRecetteDatabase(code: Refusal): never { throw new DatabaseRefusal(code); }
/** Only the startup hook reports these fixed labels, never request handlers. */
export function reportRecetteStartupFailure(error: unknown, env: NodeJS.ProcessEnv = process.env): void {
  if (env.VERCEL_TARGET_ENV !== 'clara-os-recette' || env.VERCEL_ENV === 'production') return;
  if (error instanceof DatabaseRefusal && codes.includes(error.diagnostic))
    console.error('[CLARA_RECETTE_STARTUP]',`RECETTE_DB_${error.diagnostic}`);
}
export function recetteNeonEndpoint(resolve: () => string): URL {
  let endpoint: URL;
  try { endpoint = new URL(resolve()); } catch { return refuseRecetteDatabase('NEON_ENDPOINT_INVALID'); }
  if (endpoint.protocol !== 'https:') refuseRecetteDatabase('NEON_ENDPOINT_PROTOCOL_INVALID');
  if (!endpoint.hostname.endsWith('.neon.tech')) refuseRecetteDatabase('NEON_ENDPOINT_HOST_INVALID');
  if (endpoint.pathname !== '/sql') refuseRecetteDatabase('NEON_ENDPOINT_PATH_INVALID');
  return endpoint;
}
