import {sql} from '@/lib/core/store/database';
import {RegistryError,databaseError,type RegistryQuery} from '@/lib/canonical/registry';
import {registryBody,sameOrigin,fields} from '@/lib/canonical/http';
import {nativeSelectors,nativeFailure} from './authority';
import {withNativeScope,nativeContext} from './scoped-context';
import {resolveLocale} from '@/i18n/config';
export function nativeChatCommands(query:RegistryQuery=sql){
 return async(scope:ReturnType<typeof nativeSelectors>,operation:string,payload:Record<string,unknown>)=>{
  try{
   const rows=await query`SELECT clara_native_chat_command(${scope.digest},${scope.workspaceId},${scope.clientId},${scope.projectId},${scope.sessionId},${operation},${JSON.stringify(payload)}::jsonb) AS data`;
   const data=(rows[0] as {data?:Record<string,unknown>})?.data;if(!data)throw new RegistryError(503,'NATIVE_CHAT_UNAVAILABLE');return data;
  }catch(error){if((error as {code?:string}).code==='40001')throw new RegistryError(409,'NATIVE_REVISION_CONFLICT');databaseError(error);}
 };
}
/** Reservation commits BEFORE cognition. Receipt and business commit share one SQL transaction.
 * A lost acknowledgement replays the receipt. An interrupted owner is never stolen.
 */
export async function nativeChatRequest(request:Request,render:()=>Promise<Response>,query:RegistryQuery=sql){
 try{
  const scope=nativeSelectors(request);sameOrigin(request);
  const body=await registryBody(request.clone());fields(body,['message','operationId','sessionId']);
  if(typeof body.operationId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(body.operationId))throw new RegistryError(400,'NATIVE_CHAT_OPERATION_REQUIRED');
  if(body.sessionId!==undefined&&body.sessionId!==scope.sessionId)throw new RegistryError(409,'NATIVE_CHAT_CONTEXT_CHANGED');
  if(typeof body.message!=='string'||!body.message.trim()||body.message.length>16000)throw new RegistryError(400,'INVALID_CHAT_MESSAGE');
  const locale=resolveLocale((request.headers.get('cookie')??'').split(';').map(v=>v.trim()).find(v=>v.startsWith('NEXT_LOCALE='))?.slice(12));
  const command=nativeChatCommands(query),reserved=await command(scope,'reserve',{operationId:body.operationId,message:body.message.trim(),locale,sessionId:scope.sessionId});
  if(reserved.state==='completed'){
   const receipt=reserved.result as {body:unknown;status:number};return Response.json(receipt.body,{status:receipt.status,headers:{'Cache-Control':'no-store','X-Clara-Operation-Replayed':'1'}});
  }
  if(reserved.state!=='owned')return Response.json({success:false,code:'NATIVE_CHAT_PENDING',operationId:body.operationId,...(reserved.request?{pendingRequest:reserved.request}:{})},{status:202,headers:{'Cache-Control':'no-store'}});
  try{
   return await withNativeScope(request,true,async()=>{
    const response=await render();response.headers.set('Cache-Control','no-store');
    nativeContext()!.chatCommitProof={jobId:reserved.jobId,ownerToken:reserved.ownerToken,result:{status:response.status,body:await response.clone().json()}};
    return response;
   },query);
  }catch(error){
   // Only a confirmed PostgreSQL rollback is terminalized. Network ambiguity pins ownership.
   if(error instanceof RegistryError&&error.status===409){
    await command(scope,'abort',{jobId:reserved.jobId,ownerToken:reserved.ownerToken,result:{status:409,body:{success:false,code:error.code}}}).catch(()=>{});
   }
   throw error;
  }
 }catch(error){return nativeFailure(error);}
}

/** Explicit local cancellation is a durable fence, not a provider cancellation claim. */
export async function cancelNativeChat(request:Request,query:RegistryQuery=sql){
 try{
  const scope=nativeSelectors(request);sameOrigin(request);const body=await registryBody(request);fields(body,['operationId','sessionId','confirm']);
  if(body.sessionId!==scope.sessionId||body.confirm!==true||typeof body.operationId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(body.operationId))throw new RegistryError(400,'INVALID_CHAT_CANCELLATION');
  const result=await nativeChatCommands(query)(scope,'cancel',body),receipt=result.result as {status:number;body:unknown};
  return Response.json({success:true,cancelled:(receipt.body as {code?:string})?.code==='NATIVE_CHAT_CANCELLED'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return nativeFailure(error);}
}
