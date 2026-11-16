import {nativeContext} from '@/lib/native/scoped-context';
import {builderSql} from './native-connector-builder-sql';
import {ConnectorBuilderDirectory} from './connector-builder-directory';

/** A provider is visible to Clara only after the canonical native session,
 * reviewed READ catalog, connection and exact owner/client/project grant.
 * No external provider call or credential decryption is involved.
 */
export type AuthorizedConnectorRead=Readonly<{
 provider:string;
 capabilityId:string;
 connectionId:string;
 revision:number;
 catalogRevision:number;
}>;

export function filterAuthorizedNativeConnectorReads(
 raw:unknown,
 directory:ConnectorBuilderDirectory,
):readonly AuthorizedConnectorRead[]{
 if(!Array.isArray(raw)||raw.length>64)return [];
 const seen=new Set<string>(),available:AuthorizedConnectorRead[]=[];
 for(const item of raw){
  if(!item||typeof item!=='object'||Array.isArray(item))return [];
  const row=item as Record<string,unknown>;
  const capability=typeof row.capabilityId==='string'?directory.findRead(row.capabilityId):null;
  const revision=Number(row.revision),catalogRevision=Number(row.catalogRevision);
  if(!capability||row.provider!==capability.provider||
     typeof row.connectionId!=='string'||
     !/^[a-zA-Z0-9._:-]{1,160}$/.test(row.connectionId)||
     !Number.isSafeInteger(revision)||revision<1||
     !Number.isSafeInteger(catalogRevision)||catalogRevision<1)return [];
  // Never silently select one of two accounts authorized for the same action.
  // An explicit account choice must first resolve the ambiguity in the
  // connection setup; the model must not choose an arbitrary connection.
  const unique=capability.id;
  if(seen.has(unique))return [];
  seen.add(unique);
  available.push({
   provider:capability.provider,capabilityId:capability.id,
   connectionId:row.connectionId,revision,catalogRevision,
  });
 }
 return Object.freeze(available);
}

export async function discoverNativeConnectorReads(
 directory:ConnectorBuilderDirectory=new ConnectorBuilderDirectory(),
):Promise<readonly AuthorizedConnectorRead[]>{
 const ctx=nativeContext();
 if(!ctx)return [];
 const s=ctx.scope;
 try{
  const rows=await builderSql`
   SELECT clara_connector_builder.native_discover(
    ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
    ${s.sessionId}
   ) AS capabilities
  `;
  return filterAuthorizedNativeConnectorReads(
   (rows[0] as {capabilities?:unknown}|undefined)?.capabilities,
   directory,
  );
 }catch{
  // No schema, unauthenticated scope or revocation: publish no capabilities.
  return [];
 }
}
