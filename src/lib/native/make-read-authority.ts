import {nativeContext} from "./scoped-context";
import type {MakeReadAuthority,MakeReadProof,NativeMakeReadKey} from "./make-read-handoff";

/** Read-only, fail-closed native Make grant resolver.
 * Existing native session/owner verification is repeated by the canonical SQL
 * function. Missing migration, credentials, permissions or scope => no grant.
 * Never provisions or elevates a Make connection.
 */
export const nativeMakeReadAuthority:MakeReadAuthority={
 async authorize(input):Promise<MakeReadProof|null>{
  const ctx=nativeContext();
  if(!ctx||ctx.userId!==input.userId||ctx.scope.workspaceId!==input.workspaceId||
     ctx.scope.clientId!==input.clientId||ctx.scope.projectId!==input.projectId)return null;
  if(!["find-drive-document","check-calendar-availability","search-calendar-events"].includes(input.scenarioKey))return null;
  const s=ctx.scope;
  try{
   const rows=await ctx.query`
    SELECT public.clara_native_make_read_resolve(
       ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
       ${s.sessionId},${input.scenarioKey}
    ) AS proof`;
   const row=(rows[0] as {proof?:unknown}|undefined)?.proof;
   if(!row||typeof row!=="object"||Array.isArray(row))return null;
   const value=row as Record<string,unknown>;
   const revision=Number(value.revision);
   if(typeof value.connectionId!=="string"||!value.connectionId||!Number.isSafeInteger(revision)||revision<=0)return null;
   return {workspaceId:s.workspaceId,clientId:s.clientId,projectId:s.projectId,ownerUserId:ctx.userId,scenarioKey:input.scenarioKey as NativeMakeReadKey,connectionId:value.connectionId,revision};
  }catch{
   // Expected until the additive authorization migration is reviewed/applied.
   // Never use workspace-wide Make scopes as fallback native permission.
   return null;
  }
 }
};
