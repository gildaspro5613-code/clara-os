import {RegistryError} from '@/lib/canonical/registry';
import {nativeContext} from '@/lib/native/scoped-context';
import {ConnectorBuilderDirectory} from './connector-builder-directory';

/** A single explicit READ grant/revoke entry for every approved connector.
 * Internal server API only: NEVER accept a model/tool call as approval.
 * Client/product UI needs a separate confirmed native transaction before
 * using this function. SQL resolves actor and enforces owner/admin + project.
 */
export function nativeBuilderAdmin(
 directory:ConnectorBuilderDirectory,
){
 return async(
  operation:'grant'|'revoke',
  input:{
   connectionId:string;
   ownerUserId:string;
   capabilityId:string;
   reason:string;
   approved:boolean;
  },
 ):Promise<{operation:'grant'|'revoke';capabilityId:string;revision:number}>=>{
  const ctx=nativeContext();
  if(!ctx||!ctx.writable)
   throw new RegistryError(403,'CONNECTOR_BUILDER_APPROVAL_SCOPE_REQUIRED');
  if(!input||input.approved!==true||
    typeof input.connectionId!=='string'||
    !/^[a-zA-Z0-9._:-]{1,160}$/.test(input.connectionId)||
    typeof input.ownerUserId!=='string'||input.ownerUserId.length<1||
    input.ownerUserId.length>160||
    typeof input.reason!=='string'||input.reason.trim().length<8||
    input.reason.length>500||
    !directory.findRead(input.capabilityId))
   throw new RegistryError(400,'CONNECTOR_BUILDER_ADMIN_INPUT_DENIED');
  const s=ctx.scope;
  // The SQL command revalidates signed identity and writable client+project
  // and commits grant+audit in one transaction, with revisioned revocation.
  try{
   const rows=await ctx.query`
    SELECT clara_connector_builder.native_admin(
     ${s.digest},${s.workspaceId},${s.clientId},${s.projectId},
     ${s.sessionId},${operation},
     ${JSON.stringify({connectionId:input.connectionId,ownerUserId:input.ownerUserId,
       capabilityId:input.capabilityId,reason:input.reason.trim(),approve:true})}::jsonb
    ) AS data
   `;
   const raw=(rows[0] as {data?:unknown}|undefined)?.data;
   if(!raw||typeof raw!=='object'||Array.isArray(raw))
    throw new RegistryError(503,'CONNECTOR_BUILDER_ADMIN_UNAVAILABLE');
   const v=raw as Record<string,unknown>,revision=Number(v.revision);
   if(v.operation!==operation||v.capabilityId!==input.capabilityId||
      !Number.isSafeInteger(revision)||revision<1)
    throw new RegistryError(503,'CONNECTOR_BUILDER_ADMIN_UNAVAILABLE');
   return {operation,capabilityId:input.capabilityId,revision};
  }catch(e){
   if(e instanceof RegistryError)throw e;
   // SQL error content is not returned to the browser or the model.
   throw new RegistryError(403,'CONNECTOR_BUILDER_ADMIN_DENIED');
  }
 };
}
