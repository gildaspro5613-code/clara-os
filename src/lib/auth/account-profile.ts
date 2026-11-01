import {sql} from '@/lib/core/store/database';
import {readAuthCookie} from './canonical-request-authorization';
import {createAuthenticatedWorkspaceResolver,sessionTokenDigest} from './authenticated-workspace-session';
import {readGoogleDisplayName} from './google-display-name';
import {nativeSelectors} from '@/lib/native/authority';
export type AccountProfile={state:'authenticated';displayName:string|null;googleIdentityLinked:boolean}|{state:'signed-out'|'unverified'|'unavailable'};
/** Presentation read only. Reuses canonical sessions/membership and never exposes IDs. */
export async function readAccountProfile(cookieHeader:string|null,query:typeof sql=sql):Promise<AccountProfile>{
 const token=readAuthCookie(cookieHeader),digest=token?sessionTokenDigest(token):null;
 if(!token||!digest)return {state:'signed-out'};
 try{
  let workspaceId:string;
  const selections=(cookieHeader??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('clara_native_selection='));
  if(selections.length){
   try{workspaceId=nativeSelectors(new Request('https://account.invalid',{headers:{cookie:cookieHeader!}})).workspaceId;}catch{return {state:'unverified'};}
  }else{
   const rows=await query`SELECT m.workspace_id FROM clara_auth_sessions s JOIN clara_workspace_memberships m ON m.user_id=s.user_id WHERE s.token_hash=${digest} AND s.revoked_at IS NULL AND s.expires_at>NOW() AND m.revoked_at IS NULL AND m.workspace_id<>'default' LIMIT 2` as Array<{workspace_id:string}>;
   if(!rows.length)return {state:'signed-out'};
   if(rows.length!==1)return {state:'unverified'};
   workspaceId=rows[0].workspace_id;
  }
  const principal=await createAuthenticatedWorkspaceResolver(query)(token,workspaceId,'connections:read');
  if(!principal)return {state:'unverified'};
  // Recheck the live session and membership in the final read. The Google flag
  // proves a verified identity association, not Workspace consent or provider health.
  const rows=await query`SELECT EXISTS(SELECT 1 FROM clara_auth_identities i WHERE i.user_id=s.user_id AND i.issuer='https://accounts.google.com') AS google_linked FROM clara_auth_sessions s JOIN clara_workspace_memberships m ON m.user_id=s.user_id WHERE s.token_hash=${digest} AND s.user_id=${principal.userId} AND s.revoked_at IS NULL AND s.expires_at>NOW() AND m.workspace_id=${principal.workspaceId} AND m.revoked_at IS NULL AND EXISTS(SELECT 1 FROM clara_auth_identities verified WHERE verified.user_id=s.user_id) LIMIT 1` as Array<{google_linked:boolean}>;
  if(rows.length!==1)return {state:'unverified'};
  return {state:'authenticated',displayName:rows[0].google_linked?readGoogleDisplayName(cookieHeader,digest):null,googleIdentityLinked:rows[0].google_linked};
 }catch{return {state:'unavailable'};}
}
