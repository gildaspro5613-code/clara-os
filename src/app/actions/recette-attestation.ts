'use server';

import { cookies } from 'next/headers';
import { CLARA_AUTH_COOKIE } from '@/lib/auth/authenticated-workspace-session';
import { attestAuthorizedRecetteDeployment } from '@/lib/recette/authorized-deployment-attestation';

/**
 * Authenticated server-action boundary; no public diagnostic GET endpoint.
 * Next.js checks Server Action origin; the caller cannot supply a session token.
 * Requires an actual pre-existing session and owner/admin workspace membership.
 * This action does not create sessions, memberships or credentials.
 */
export async function attestRecetteFromAdminSession(workspaceId: string) {
  if (typeof workspaceId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(workspaceId) || workspaceId === 'default') {
    return {status:'NON ATTESTÉ' as const, checks:[], writesRequested:false as const};
  }
  const cookieStore = await cookies();
  return attestAuthorizedRecetteDeployment({
    sessionToken: cookieStore.get(CLARA_AUTH_COOKIE)?.value,
    workspaceId,
  });
}
