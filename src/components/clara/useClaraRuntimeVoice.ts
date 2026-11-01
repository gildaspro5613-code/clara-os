"use client";

import {useCallback,useEffect,useRef,useState} from 'react';
import type {NativeSelectors} from '@/lib/native/authority';
import type {ClaraConversationMessage} from '@/lib/core/session';

type VoiceState='idle'|'connecting'|'listening'|'processing'|'speaking'|'error';
/** The historical STT → Clara runtime → TTS chain, shared by the two existing views.
 * Native turns use the very same operation identity/history as typed messages.
 */
export function useClaraRuntimeVoice(disabled:boolean,scope?:NativeSelectors){
 const [state,setState]=useState<VoiceState>('idle');
 const [authorized,setAuthorized]=useState(false);
 const [unavailable,setUnavailable]=useState<'configuration'|'authorization'|'network'|'recette'|null>(null);
 const resources=useRef<{recorder?:MediaRecorder;stream?:MediaStream;audio?:HTMLAudioElement;url?:string;abort?:AbortController;timer?:ReturnType<typeof setInterval>;deadline?:ReturnType<typeof setTimeout>;silence?:ReturnType<typeof setInterval>;context?:AudioContext;epoch:number;active:boolean}>({epoch:0,active:false});
 const key=scope?'clara.pending-chat:'+scope.sessionId:null;
 const query=scope?'?'+new URLSearchParams({...scope}).toString():'';
 const headers=scope?{'x-clara-native-voice':'1'}:undefined;
 const stop=useCallback(()=>{
  const r=resources.current;r.epoch++;r.active=false;
  if(r.timer)clearInterval(r.timer);if(r.deadline)clearTimeout(r.deadline);if(r.silence)clearInterval(r.silence);void r.context?.close().catch(()=>{});
  r.abort?.abort();if(r.recorder){r.recorder.onstop=null;if(r.recorder.state!=='inactive')r.recorder.stop();}
  r.stream?.getTracks().forEach(t=>t.stop());if(r.audio){r.audio.pause();r.audio.removeAttribute('src');r.audio.load();}
  if(r.url)URL.revokeObjectURL(r.url);
  r.recorder=undefined;r.stream=undefined;r.audio=undefined;r.url=undefined;r.timer=undefined;r.deadline=undefined;r.silence=undefined;r.context=undefined;
 },[]);
 useEffect(()=>{const interrupt=()=>{stop();setState('idle');};
  const hidden=()=>{if(document.visibilityState!=='visible')interrupt();};
  const other=(event:Event)=>{if((event as CustomEvent).detail!==resources.current&&resources.current.active)interrupt();};
  window.addEventListener('pagehide',interrupt);window.addEventListener('clara:voice-activity',other);document.addEventListener('visibilitychange',hidden);
  return()=>{window.removeEventListener('pagehide',interrupt);window.removeEventListener('clara:voice-activity',other);document.removeEventListener('visibilitychange',hidden);stop();};
 },[stop,query]);
 useEffect(()=>{if(disabled){stop();}},[disabled,stop]);
 useEffect(()=>{
  if(disabled||!query)return;
  let current=true;let controller:AbortController|undefined;
  const probe=async()=>{
   controller?.abort();const abort=new AbortController();controller=abort;
   try{
    // Initial/cold-start reads may take longer than an active revocation check.
    const response=await fetch('/api/voice/transcribe'+query,{headers:{'x-clara-native-voice':'1'},cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(10000)])});
    const data=await response.json();if(!current||abort.signal.aborted)return;
    setAuthorized(response.ok&&data.success===true);
    setUnavailable(response.ok?null:response.status===401||response.status===403?'authorization':data.code==='NATIVE_VOICE_EXTERNAL_EXECUTION_BLOCKED'?'recette':data.code?.startsWith('NATIVE_VOICE_CONFIG_')?'configuration':'network');
   }catch{if(current&&!abort.signal.aborted){setAuthorized(false);setUnavailable('network');}}
  };
  void probe();window.addEventListener('online',probe);window.addEventListener('focus',probe);
  return()=>{current=false;controller?.abort();window.removeEventListener('online',probe);window.removeEventListener('focus',probe);};
 },[query,disabled]);
 async function toggle(){
  const r=resources.current;
  if(disabled||(scope&&!authorized))return;
  if(r.active){stop();setState('idle');return;}
  window.dispatchEvent(new CustomEvent('clara:voice-activity',{detail:r}));
  r.active=true;const epoch=++r.epoch;const abort=new AbortController();r.abort=abort;
  const alive=()=>{if(!r.active||r.epoch!==epoch||abort.signal.aborted)throw Error('VOICE_INTERRUPTED');};
  const check=async()=>{
   alive();if(!scope)return;
   try{
    const response=await fetch('/api/voice/transcribe'+query,{headers,cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(3000)])});
    if(!response.ok)throw Error('VOICE_AUTHORITY_DENIED');alive();
   }catch(error){if(r.epoch===epoch)setAuthorized(false);throw error;}
  };
  const fail=()=>{if(r.epoch===epoch){stop();setState('error');}};
  const deadline=()=>{if(r.deadline)clearTimeout(r.deadline);r.deadline=setTimeout(fail,120_000);};
  async function playAndCommit(operation:{operationId:string;message:string;sessionId?:string}){
   await check();setState('processing');
   const response=await fetch('/api/clara/chat'+query,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(operation),signal:abort.signal});
   const chat=await response.json();alive();
   if(response.status===202){
    const pending=chat.pendingRequest??operation;
    if(key&&pending.sessionId===scope?.sessionId&&typeof pending.operationId==='string'&&typeof pending.message==='string')sessionStorage.setItem(key,JSON.stringify(pending));
    throw Error('VOICE_CHAT_PENDING');
   }
   if(!response.ok||!chat.success)throw Error('VOICE_CHAT_DENIED');
   await check();
   let conversation:ClaraConversationMessage[]=chat.conversation;
   if(scope){
    const response=await fetch('/api/clara/conversation'+query+'&'+new URLSearchParams({thread:scope.sessionId,limit:'100'}),{signal:abort.signal,cache:'no-store'});
    const history=await response.json();if(!response.ok||!history.success)throw Error('VOICE_HISTORY_DENIED');conversation=history.messages;
   }
   alive();if(!Array.isArray(conversation))throw Error('VOICE_HISTORY_UNAVAILABLE');
   if(key)sessionStorage.removeItem(key);
   window.dispatchEvent(new CustomEvent('clara:conversation-updated',{detail:{conversation,sessionId:scope?.sessionId}}));
   const receiptReply=(chat.conversation as ClaraConversationMessage[]|undefined)?.filter(m=>m.role==='clara').at(-1);
   const last=scope?conversation.find(m=>m.id===receiptReply?.id&&m.role==='clara'):receiptReply;
   if(!last)throw Error('VOICE_REPLY_REQUIRED'); // Never speak a later concurrent text reply instead.
   await check();
   const audioResponse=await fetch('/api/voice/speak'+query,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(scope?{messageId:last.id}:{text:chat.message}),signal:abort.signal});
   if(!audioResponse.ok)throw Error('VOICE_SYNTHESIS_DENIED');
   const blob=await audioResponse.blob();await check();alive();
   r.url=URL.createObjectURL(blob);const audio=new Audio(r.url);r.audio=audio;setState('speaking');
   audio.onended=()=>{if(r.epoch===epoch&&r.active&&r.audio===audio){audio.onended=null;audio.pause();audio.removeAttribute('src');if(r.url)URL.revokeObjectURL(r.url);r.url=undefined;r.audio=undefined;void listen().catch(fail);}};audio.onerror=fail;
   await audio.play();alive();
  }
  async function listen(){
   await check();deadline();
   // Reuse the same permission/stream for this explicitly started conversation.
   // Tracks are disabled during processing/playback so Clara cannot transcribe herself.
   if(!r.stream){
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    if(!r.active||r.epoch!==epoch){stream.getTracks().forEach(t=>t.stop());return;}r.stream=stream;
   }
   alive();await check();r.stream.getAudioTracks().forEach(t=>{t.enabled=true;});
   const context=r.context!;if(context.state==='suspended')await context.resume();alive();
   const source=context.createMediaStreamSource(r.stream),analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);
   const samples=new Float32Array(analyser.fftSize),chunks:Blob[]=[];
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
   const recorder=new MediaRecorder(r.stream,mime?{mimeType:mime}:undefined);r.recorder=recorder;
   let spoke=false,lastSpeech=performance.now(),speechStarted=0;const started=performance.now();
   const detach=()=>{if(r.silence)clearInterval(r.silence);r.silence=undefined;source.disconnect();analyser.disconnect();};
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=fail;
   recorder.onstop=()=>{detach();r.stream?.getAudioTracks().forEach(t=>{t.enabled=false;});r.recorder=undefined;
    void(async()=>{
     await check();deadline();setState('processing');const form=new FormData();const type=recorder.mimeType||mime||'audio/webm';form.append('audio',new Blob(chunks,{type}),type.includes('mp4')?'clara-voice.mp4':'clara-voice.webm');
     const response=await fetch('/api/voice/transcribe'+query,{method:'POST',headers,body:form,signal:abort.signal});
     const transcription=await response.json();alive();if(!response.ok||!transcription.success||typeof transcription.text!=='string')throw Error('VOICE_TRANSCRIPTION_DENIED');
     if(!transcription.text.trim()){await listen();return;}
     await check();const operation={operationId:crypto.randomUUID(),message:transcription.text,...(scope?{sessionId:scope.sessionId}:{})};
     if(key){if(sessionStorage.getItem(key))throw Error('VOICE_CHAT_ALREADY_PENDING');sessionStorage.setItem(key,JSON.stringify(operation));}
     await playAndCommit(operation);
    })().catch(fail);
   };
   recorder.start();setState('listening');
   r.silence=setInterval(()=>{
    if(!r.active||r.epoch!==epoch||recorder.state!=='recording'){detach();return;}
    analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length),now=performance.now();
    if(rms>=0.018){if(!spoke)speechStarted=now;spoke=true;lastSpeech=now;}
    if(spoke&&now-speechStarted>=300&&(now-lastSpeech>=1100||now-started>=45_000)){detach();recorder.stop();}
    else if(!spoke&&now-started>=30_000){detach();stop();setState('idle');}
   },50);
  }
  try{
   // Resume Web Audio within the user's gesture (including mobile browsers).
   r.context=new AudioContext();await r.context.resume();alive();
   setState('connecting');await check();
   if(scope){let checking=false;r.timer=setInterval(()=>{if(checking)return;checking=true;check().catch(fail).finally(()=>{checking=false;});},500);}
   deadline();
   const saved=key?sessionStorage.getItem(key):null;
   if(saved){const pending=JSON.parse(saved);if(pending.sessionId!==scope?.sessionId||typeof pending.operationId!=='string'||typeof pending.message!=='string')throw Error('VOICE_PENDING_INVALID');await playAndCommit(pending);return;}
   await listen();
  }catch{fail();}
 }
 return {state,toggle,authorized,unavailable,active:!['idle','error'].includes(state)};
}
