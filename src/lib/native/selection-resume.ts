import {canonicalRegistry,registryContext,opaque} from '@/lib/canonical/registry';
import {hydrateNative,nativeCommand,nativeThreadCertified} from '@/lib/native/scoped-context';

/** A preference, never an authority: every selected context is checked against
 * the currently authenticated user by the native SQL commands on every request. */
export const NATIVE_SELECTION_COOKIE='clara_native_selection';
export const NATIVE_SELECTION_MAX_AGE=60*60*24*30;

export type NativeSelection={workspaceId:string;clientId:string;projectId:string;sessionId:string};

export function nativeSelectionCookie(value:NativeSelection){
 return `${NATIVE_SELECTION_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${NATIVE_SELECTION_MAX_AGE}`;
}

/** Never create a session or infer a project when more than one is accessible.
 * This is a bounded, read-only recovery of a single unambiguous scope.
 * The final read revalidates the candidate's native user/project authority. */
export async function restoreNativeSelection(request:Request):Promise<Response>{
 const {digest}=registryContext(request.headers.get('cookie'),'workspace-selector');
 const workspaces=await canonicalRegistry.workspaces(digest) as Array<{workspace_id:string}>;
 // A syntactically valid but expired OS auth cookie must still show sign-in,
 // not a workspace selector. No workspace/identity is inferred or created.
 if(!workspaces.length)return Response.json({success:false,code:'AUTHENTICATED_OS_SESSION_REQUIRED'},{status:401,headers:{'Cache-Control':'no-store'}});
 const choose=()=>Response.json({success:true,restored:false},{headers:{'Cache-Control':'no-store'}});
 // A previously selected but now invalid/revoked context must not silently
 // switch to a different project or thread. The owner chooses explicitly.
 const hadSelection=(request.headers.get('cookie')??'').split(';').some(part=>part.trim().startsWith(NATIVE_SELECTION_COOKIE+'='));
 if(hadSelection||workspaces.length!==1)return choose();
 const workspaceId=opaque(workspaces[0].workspace_id);
 const authority={digest,workspaceId};
 const clients=await canonicalRegistry.command(authority,'list',{after:'',limit:2}) as Array<{id:string}>;
 if(!Array.isArray(clients)||clients.length!==1)return choose();
 const clientId=opaque(clients[0].id);
 const projects=await canonicalRegistry.command(authority,'listProjects',{clientId,after:'',limit:2}) as Array<{id:string}>;
 if(!Array.isArray(projects)||projects.length!==1)return choose();
 const projectId=opaque(projects[0].id);
 const scope={digest,workspaceId,clientId,projectId,sessionId:'native:listing'};
 const listed=await nativeCommand(scope,'list');
 const sessions=(listed.sessions??[]) as Array<{sessionId:string;updatedAt:string}>;
 if(!Array.isArray(sessions)||!sessions.length)return choose();
 const ordered=sessions.filter(s=>typeof s?.sessionId==='string'&&typeof s.updatedAt==='string'&&Number.isFinite(Date.parse(s.updatedAt)))
  .sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).slice(0,30);
 for(const candidate of ordered){
  // Preserve the native selector's absolute exclusion of Live/external threads.
  if(candidate.sessionId.startsWith('external:')||candidate.sessionId==='native:listing')continue;
  try{
   const selected={workspaceId,clientId,projectId,sessionId:opaque(candidate.sessionId)};
   const data=await nativeCommand({...scope,sessionId:selected.sessionId},'read');
   if(data.session&&nativeThreadCertified(hydrateNative(data.session as Record<string,unknown>))){
    return Response.json({success:true,restored:true},{headers:{'Cache-Control':'no-store','Set-Cookie':nativeSelectionCookie(selected)}});
   }
  }catch{
   // A stale, revoked or uncertified candidate must never be revived.
   // A subsequent eligible session can still be resumed.
  }
 }
 return choose();
}
