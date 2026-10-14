import {withNativeScope,nativeContext,nativeRequest,writableNativeContext} from '@/lib/native/scoped-context';
import {nativeGoogleCommand,googleAuthority} from '@/lib/native/google-authority';
import {nativeFailure} from '@/lib/native/authority';
import {fields,registryBody} from '@/lib/canonical/http';
import {opaque,RegistryError} from '@/lib/canonical/registry';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return await withNativeScope(request,false,async()=>{
 const data=await nativeGoogleCommand('list');return Response.json({success:true,...data,selectedConnectionId:nativeContext()!.session.googleConnectionId??null},{headers:{'Cache-Control':'no-store'}});
});}catch(error){return nativeFailure(error);}}
export async function POST(request:Request){return nativeRequest(request,async()=>{
 const body=await registryBody(request.clone()),action=opaque(body.action),connectionId=opaque(body.connectionId);
 fields(body,['action','connectionId',...(['delegate','revokeDelegation'].includes(action)?['userId']:[])]);
 if(action==='select'){
  await googleAuthority(connectionId);writableNativeContext().session.googleConnectionId=connectionId;
 }else if(['delegate','revokeDelegation','revoke'].includes(action))await nativeGoogleCommand(action,{connectionId,...(action==='revoke'?{}:{userId:opaque(body.userId)})});
 else throw new RegistryError(400,'INVALID_NATIVE_GOOGLE_COMMAND');
 return Response.json({success:true},{headers:{'Cache-Control':'no-store'}});
});}
