import {nativeContext} from '@/lib/native/scoped-context';
import {ConnectorBuilderDirectory} from './connector-builder-directory';

export type NativeConnectorReadCandidate=Readonly<{
 provider:string;capabilityId:string;connectionId:string;
}>;
export function filterNativeConnectorCandidates(
 raw:unknown,directory:ConnectorBuilderDirectory,
):readonly NativeConnectorReadCandidate[]{
 if(!Array.isArray(raw)||raw.length>64)return [];
 const candidates:NativeConnectorReadCandidate[]=[];
 const seen=new Set<string>();
 for(const item of raw){
  if(!item||typeof item!=='object'||Array.isArray(item))return [];
  const r=item as Record<string,unknown>;
  const capability=typeof r.capabilityId==='string'
    ?directory.findRead(r.capabilityId):null;
  if(!capability||r.provider!==capability.provider||
     typeof r.connectionId!=='string'||
     !/^[a-zA-Z0-9._:-]{1,160}$/.test(r.connectionId))return [];
  const id=r.capabilityId+':'+r.connectionId;
  if(seen.has(id))return [];
  seen.add(id);
  candidates.push({provider:capability.provider,capabilityId:capability.id,
   connectionId:r.connectionId});
 }
 return Object.freeze(candidates);
}

/** Lists only owner-managed candidates whose supplier connection is already
 * ACTIVE and whose READ catalog entry has an explicit review. No secrets.
 */
export async function nativeConnectorCandidates(
 directory:ConnectorBuilderDirectory=new ConnectorBuilderDirectory(),
):Promise<readonly NativeConnectorReadCandidate[]>{
 const ctx=nativeContext();
 if(!ctx)return [];
 const s=ctx.scope;
 try{
  const rows=await ctx.query`
   SELECT clara_connector_builder.native_candidates(
    ${s.digest},${s.workspaceId},${s.clientId},
    ${s.projectId},${s.sessionId}
   ) AS candidates
  `;
  return filterNativeConnectorCandidates(
   (rows[0] as {candidates?:unknown}|undefined)?.candidates,
   directory,
  );
 }catch{return [];}
}
