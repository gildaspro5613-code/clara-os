/** Static, secret-free readiness gate for the EXISTING Brevo OAuth connection.
 * No provider call and no grant is performed when checking these settings. */
export const BREVO_ALLOWED_READ_SCOPES = [
  'contacts:read',
  'campaigns.email:read',
  'transactional.email:read',
] as const;
type BrevoEnv = {
  BREVO_CLIENT_ID?: string;
  BREVO_CLIENT_SECRET?: string;
  BREVO_REDIRECT_URI?: string;
  BREVO_OAUTH_SCOPES?: string;
};
export function brevoReadOAuthStatus(env: BrevoEnv = process.env): {ready:boolean;scopes:string[]} {
  const scopes=(env.BREVO_OAUTH_SCOPES??'').split(/[ ,]+/).filter(Boolean);
  const allowed=new Set<string>(BREVO_ALLOWED_READ_SCOPES);
  const configured=Boolean(env.BREVO_CLIENT_ID?.trim() && env.BREVO_CLIENT_SECRET?.trim() && env.BREVO_REDIRECT_URI?.trim());
  const scoped=scopes.length===BREVO_ALLOWED_READ_SCOPES.length &&
    scopes.every(scope=>allowed.has(scope)) &&
    BREVO_ALLOWED_READ_SCOPES.every(scope=>scopes.includes(scope));
  return {ready: configured && scoped, scopes: scoped ? scopes : []};
}
