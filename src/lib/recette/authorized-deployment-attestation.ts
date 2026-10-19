import 'server-only';
import { resolveAuthenticatedWorkspace } from '@/lib/auth/authenticated-workspace-session';
import { collectRecetteDeploymentEvidence } from './deployment-evidence';

/**
 * Internal-only entry point. The caller must obtain the opaque session token
 * from the server-validated cookie, never from an HTTP body, query or header.
 * This module deliberately does not define an HTTP route or scheduled job.
 */
export async function attestAuthorizedRecetteDeployment(input: {
  sessionToken: string | undefined;
  workspaceId: string;
}): Promise<{status:'FAIL'|'NON ATTESTÉ';checks:string[];writesRequested:false}> {
  const denied = {status:'NON ATTESTÉ' as const,checks:[],writesRequested:false as const};
  try {
    // Never resolve a session against an unknown or production database.
    // The shared workspace resolver uses the app's default SQL binding.
    if (process.env.VERCEL_ENV === 'production' ||
        process.env.VERCEL_PROJECT_ID !== 'prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz' ||
        process.env.CLARA_RECETTE_MODE !== 'isolated-v1' ||
        process.env.CLARA_RECETTE_NEON_BRANCH_ID !== 'br-crimson-feather-b2zr00sf' ||
        !process.env.DATABASE_URL || process.env.POSTGRES_URL !== undefined) return denied;
    // Fail closed: membership must be active and have owner/admin permission.
    const principal = await resolveAuthenticatedWorkspace(
      input.sessionToken,
      input.workspaceId,
      'connections:manage',
    );
    if (!principal) return denied;
    // Authorization is necessary but not sufficient to prove deployment provenance.
    return await collectRecetteDeploymentEvidence();
  } catch {
    return denied;
  }
}
