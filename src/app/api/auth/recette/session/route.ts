import { NextResponse } from 'next/server';
import { recetteDatabase, recetteRequested } from '@/lib/recette/policy';
import { resolveAuthenticatedWorkspace } from '@/lib/auth/authenticated-workspace-session';
import { sql } from '@/lib/core/store/database';
import { authenticatedSessionCookie } from '@/lib/auth/authenticated-session-lifecycle';
import { isSameOriginRequest } from '@/lib/auth/session-request-security';
import { readDocumentRequest } from '@/lib/documents/bounded-request';
export const runtime = 'nodejs';
/** Redeem an EXISTING canonical session, never create identity/session/ACL from input.
 * Production exposes neither this adapter nor the test login page. */
export async function POST(request: Request) {
  try {
    if (!recetteRequested()) return Response.json({success:false,code:'NOT_FOUND'},{status:404});
    recetteDatabase();
    if (!isSameOriginRequest(request.headers.get('origin'),process.env.CLARA_AUTH_APP_ORIGIN))
      return Response.json({success:false,code:'SAME_ORIGIN_REQUIRED'},{status:403});
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded')
      return Response.json({success:false,code:'FORM_REQUIRED'},{status:415});
    const form = new URLSearchParams(new TextDecoder().decode(await readDocumentRequest(request,2048)));
    if (form.getAll('token').length !== 1 || form.getAll('workspaceId').length !== 1)
      return Response.json({success:false,code:'INVALID_RECETTE_SESSION'},{status:400});
    const token=form.get('token')!, workspaceId=form.get('workspaceId')!;
    if (!await resolveAuthenticatedWorkspace(token,workspaceId,'connections:read')) {
      // A bounded, read-only diagnostic for this isolated fictional fixture.
      // No session hashes, credentials, user data or database addresses are returned.
      // Never expose fixture state to unauthenticated callers.
      // Log only an allowlisted category, never submitted values.
      const fixture = await sql`
        SELECT
          EXISTS (
            SELECT 1 FROM clara_auth_sessions
            WHERE user_id = 'recette-176-fictional-user-v1'
              AND revoked_at IS NULL AND expires_at > NOW()
          ) AS active_fixture,
          EXISTS (
            SELECT 1 FROM clara_workspace_memberships
            WHERE user_id = 'recette-176-fictional-user-v1'
              AND workspace_id = 'recette-176-fictional-workspace-v1'
              AND revoked_at IS NULL
          ) AS fixture_membership
      ` as { active_fixture: boolean; fixture_membership: boolean }[];
      const diagnostic = fixture[0]?.active_fixture === true
        ? (fixture[0]?.fixture_membership === true ? 'TOKEN_OR_WORKSPACE_MISMATCH' : 'FIXTURE_MEMBERSHIP_MISSING')
        : 'FIXTURE_SESSION_NOT_IN_DEPLOYMENT_DATABASE';
      console.warn('RECETTE_SESSION_DIAGNOSTIC', diagnostic);
      return Response.json(
        { success: false, code: 'RECETTE_SESSION_DENIED' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const response=NextResponse.redirect(new URL('/',process.env.CLARA_AUTH_APP_ORIGIN),303);
    const cookie=authenticatedSessionCookie(token,true);
    response.cookies.set(cookie.name,cookie.value,cookie.options);
    response.headers.set('Cache-Control','no-store');
    return response;
  } catch { return Response.json({success:false,code:'RECETTE_SESSION_UNAVAILABLE'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
