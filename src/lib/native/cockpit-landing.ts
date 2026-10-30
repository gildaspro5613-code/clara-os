import {readAuthCookie} from '@/lib/auth/canonical-request-authorization';
import {resolveSoleAuthenticatedWorkspace} from '@/lib/auth/sole-authenticated-workspace';

type Resolver=typeof resolveSoleAuthenticatedWorkspace;
/** No business read, fallback session, workspace default or implicit selection.
 * Any supplied selection (even invalid) must go through nativePage unchanged. */
export async function cockpitLanding(request:Request,resolve:Resolver=resolveSoleAuthenticatedWorkspace):Promise<'scoped'|'welcome'|'locked'>{
 const cookie=request.headers.get('cookie');
 if((cookie??'').split(';').some(part=>part.trim().startsWith('clara_native_selection=')))return 'scoped';
 const token=readAuthCookie(cookie);if(!token)return 'locked';
 return await resolve(token,'connections:read')?'welcome':'locked';
}
