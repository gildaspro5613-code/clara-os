import {authorizeClaraRequest} from '@/lib/auth/canonical-request-authorization';
import {sameOrigin} from '@/lib/canonical/http';
import {RegistryError} from '@/lib/canonical/registry';
import {nativeSelectors,nativeFailure} from './authority';
import {nativeCommand,hydrateNative,nativeThreadCertified} from './scoped-context';

/** Native selection never falls back to a legacy, server-global provider route. */
export function hasNativeVoiceScope(request:Request){
 return request.headers.get('x-clara-native-voice')==='1'||new URL(request.url).searchParams.has('sessionId')||/(?:^|;)\s*clara_native_selection=/.test(request.headers.get('cookie')??'');
}
export async function authorizeNativeVoice(request:Request){
 const scope=nativeSelectors(request);
 if(request.method!=='GET')sameOrigin(request);
 // Keep the existing provider operator permission; native read alone is insufficient.
 if(!await authorizeClaraRequest(request.headers.get('cookie'),scope.workspaceId,'connections:manage'))throw new RegistryError(403,'NATIVE_VOICE_OPERATOR_REQUIRED');
 const view=await nativeCommand(scope,'write'); // Checks current client/project management rights; no mutation.
 if(!nativeThreadCertified(hydrateNative(view.session as Record<string,unknown>)))throw new RegistryError(409,'NATIVE_THREAD_REVIEW_REQUIRED');
 return scope;
}
/** Buffered STT/TTS only: no autonomous provider Conversation session is opened.
 * Polling is bounded (500 ms); any failure or disconnect aborts the HTTP request.
 * Recheck after completion before releasing transcription/audio to the caller.
 */
export async function nativeVoiceOperation(request:Request,run:(scope:Awaited<ReturnType<typeof authorizeNativeVoice>>,signal:AbortSignal)=>Promise<Response>){
 const controller=new AbortController();let timer:ReturnType<typeof setInterval>|undefined,checking=false;let failure:unknown;
 const cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});
 try{
  const scope=await authorizeNativeVoice(request);
  if(request.signal.aborted)throw new RegistryError(409,'NATIVE_VOICE_INTERRUPTED');
  timer=setInterval(()=>{if(checking)return;checking=true;authorizeNativeVoice(request).catch(error=>{failure=error;controller.abort();}).finally(()=>{checking=false;});},500);
  const response=await run(scope,controller.signal);
  if(failure)throw failure;
  if(controller.signal.aborted)throw new RegistryError(409,'NATIVE_VOICE_INTERRUPTED');
  await authorizeNativeVoice(request);
  response.headers.set('Cache-Control','no-store');return response;
 }catch(error){return nativeFailure(failure??error);}
 finally{if(timer)clearInterval(timer);request.signal.removeEventListener('abort',cancel);controller.abort();}
}
