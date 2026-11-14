import {sql} from '@/lib/core/store/database';
import {databaseError,RegistryError,type RegistryQuery} from '@/lib/canonical/registry';
import {nativeContext} from './scoped-context';
export function nativeDocumentCommand(query:RegistryQuery=sql){
 return async(operation:string,payload:Record<string,unknown>)=>{
  const ctx=nativeContext();if(!ctx)throw new RegistryError(403,'NATIVE_SCOPE_REQUIRED');const s=ctx.scope;
  try{const rows=await query`SELECT clara_native_document_command(${s.digest},${s.workspaceId},${s.clientId},${s.projectId},${s.sessionId},${operation},${JSON.stringify(payload)}::jsonb) AS data`;
   const data=(rows[0] as {data?:Record<string,unknown>})?.data;if(!data)throw new RegistryError(503,'NATIVE_DOCUMENT_OPERATION_UNAVAILABLE');return data;
  }catch(error){if((error as {code?:string}).code==='40001')throw new RegistryError(409,'NATIVE_REVISION_CONFLICT');databaseError(error);}
 };
}
