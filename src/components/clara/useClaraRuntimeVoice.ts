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
 const resources=useRef<{recorder?:MediaRecorder;stream?:MediaStream;audio?:HTMLAudioElement;url?:string;abort?:AbortController;timer?:ReturnType<typeof setInterval>;deadline?:ReturnType<typeof setTimeout>;epoch:number;active:boolean}>({epoch:0,active:false});
 const key=scope?'clara.pending-chat:'+scope.sessionId:null;
 const query=scope?'?'+new URLSearchParams({...scope}).toString():'';
 const headers=scope?{'x-clara-native-voice':'1'}:undefined;
 const stop=useCallback(()=>{
  const r=resources.current;r.epoch++;r.active=false;
  if(r.timer)clearInterval(r.timer);if(r.deadline)clearTimeout(r.deadline);
  r.abort?.abort();if(r.recorder){r.recorder.onstop=null;if(r.recorder.state!=='inactive')r.recorder.stop();}
  r.stream?.getTracks().forEach(t=>t.stop());if(r.audio){r.audio.pause();r.audio.removeAttribute('src');r.audio.load();}
  if(r.url)URL.revokeObjectURL(r.url);
  r.recorder=undefined;r.stream=undefined;r.audio=undefined;r.url=undefined;r.timer=undefined;r.deadline=undefined;
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
  const abort=new AbortController();let current=true;
  fetch('/api/voice/transcribe'+query,{headers:{'x-clara-native-voice':'1'},cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(3000)])})
   .then(response=>{if(current)setAuthorized(response.ok);}).catch(()=>{if(current)setAuthorized(false);});
  return()=>{current=false;abort.abort();};
 },[query,disabled]);
 async function toggle(){
  const r=resources.current;
  if(disabled||(scope&&!authorized))return;
  if(r.active){if(r.recorder?.state==='recording'){r.recorder.stop();return;}stop();setState('idle');return;}
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
   audio.onended=()=>{if(r.epoch===epoch){stop();setState('idle');}};audio.onerror=fail;
   await audio.play();alive();
  }
  try{
   setState('connecting');await check();
   if(scope){let checking=false;r.timer=setInterval(()=>{if(checking)return;checking=true;check().catch(fail).finally(()=>{checking=false;});},500);}
   // Fail closed even when a browser permission prompt or network request stalls.
   r.deadline=setTimeout(fail,120_000);
   const saved=key?sessionStorage.getItem(key):null;
   if(saved){const pending=JSON.parse(saved);if(pending.sessionId!==scope?.sessionId||typeof pending.operationId!=='string'||typeof pending.message!=='string')throw Error('VOICE_PENDING_INVALID');await playAndCommit(pending);return;}
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!r.active||r.epoch!==epoch){stream.getTracks().forEach(t=>t.stop());return;}r.stream=stream;
   await check();const chunks:Blob[]=[];const recorder=new MediaRecorder(stream);r.recorder=recorder;
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=()=>{r.stream?.getTracks().forEach(t=>t.stop());r.stream=undefined;r.recorder=undefined;
    void(async()=>{
     await check();setState('processing');const form=new FormData();form.append('audio',new Blob(chunks,{type:recorder.mimeType||'audio/webm'}),'clara-voice.webm');
     const response=await fetch('/api/voice/transcribe'+query,{method:'POST',headers,body:form,signal:abort.signal});
     const transcription=await response.json();alive();if(!response.ok||!transcription.success||!transcription.text)throw Error('VOICE_TRANSCRIPTION_DENIED');
     await check();const operation={operationId:crypto.randomUUID(),message:transcription.text,...(scope?{sessionId:scope.sessionId}:{})};
     if(key){if(sessionStorage.getItem(key))throw Error('VOICE_CHAT_ALREADY_PENDING');sessionStorage.setItem(key,JSON.stringify(operation));}
     await playAndCommit(operation);
    })().catch(fail);
   };
   recorder.start();setState('listening');
  }catch{fail();}
 }
 return {state,toggle,authorized,active:!['idle','error'].includes(state)};
}
