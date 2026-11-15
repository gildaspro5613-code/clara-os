import {authorizeNativeVoice} from '@/lib/native/voice';
import {nativeFailure} from '@/lib/native/authority';

/** First-party same-session authority probe. Never mints signed provider URLs. */
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const scope=await authorizeNativeVoice(request);
  return Response.json({active:true,sessionId:scope.sessionId},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return nativeFailure(error);}
}
