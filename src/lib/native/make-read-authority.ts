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
    SELECT grant_.connection_id,grant_.revision
    FROM clara_native_make_read_authority grant_
    JOIN clara_connections conn ON conn.id=grant_.connection_id AND conn.workspace_id=${s.workspaceId}
       AND conn.provider='make' AND conn.status='ACTIVE'
    WHERE grant_.workspace_id=${s.workspaceId} AND grant_.client_id=${s.clientId}
       AND grant_.project_id=${s.projectId} AND grant_.owner_user_id=${ctx.userId}
       AND grant_.scenario_key=${input.scenarioKey} AND grant_.revoked_at IS NULL
       AND conn.scopes @> ${JSON.stringify([`make:scenario:${input.scenarioKey}`])}::jsonb
       AND clara_native_read_session(${s.digest},${s.workspaceId},${s.clientId},${s.projectId},${s.sessionId}) IS NOT NULL
    LIMIT 1`;
   const row=rows[0] as {connection_id?:unknown;revision?:unknown}|undefined;
   const revision=Number(row?.revision);
   if(typeof row?.connection_id!=="string"||!row.connection_id||!Number.isSafeInteger(revision)||revision<=0)return null;
   return {workspaceId:s.workspaceId,clientId:s.clientId,projectId:s.projectId,ownerUserId:ctx.userId,scenarioKey:input.scenarioKey as NativeMakeReadKey,connectionId:row.connection_id,revision};
  }catch{
   // Expected until the additive authorization migration is reviewed/applied.
   // Never use workspace-wide Make scopes as fallback native permission.
   return null;
  }
 }
};
