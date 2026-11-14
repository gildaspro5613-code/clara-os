import {nativeSelectors,nativeFailure} from '@/lib/native/authority';
import {nativeCommand} from '@/lib/native/scoped-context';
import {RegistryError,opaque} from '@/lib/canonical/registry';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const scope=nativeSelectors(request),params=new URL(request.url).searchParams;
  if(params.get('thread')!==scope.sessionId)throw new RegistryError(409,'NATIVE_CHAT_CONTEXT_CHANGED');
  const limit=Number(params.get('limit')??50);if(!Number.isInteger(limit)||limit<1||limit>100)throw new RegistryError(400,'INVALID_HISTORY_PAGE');
  const beforeMessageId=params.get('beforeMessageId');
  const history=await nativeCommand(scope,'history',{limit,...(beforeMessageId?{beforeMessageId:opaque(beforeMessageId)}:{})});
  return Response.json({success:true,...history},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return nativeFailure(error);}
}
