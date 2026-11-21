import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Actual hook source with isolated browser/provider adapters; no supplier IO.
const scope={workspaceId:'w',clientId:'c',projectId:'p',sessionId:'native:voice-fixture'};
const operation={operationId:'stable-native-operation',sessionId:scope.sessionId,message:'Préparons les latéraux.'};
const answer={id:'saved-answer',role:'clara',content:'Voici la proposition enregistrée.'};
function harness(chat:(attempt:number)=>Promise<Response>,options:{history?:()=>Response;hold?:boolean;revoke?:boolean}={}){
 const storage=new Map([['clara.pending-chat:'+scope.sessionId,JSON.stringify(operation)]]);
 const states:unknown[]=[],calls:Array<{path:string;body?:Record<string,unknown>}> = [];
 let index=0,attempt=0,pending=false;let release:(()=>void)|undefined;
 const exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync('src/components/clara/useClaraRuntimeVoice.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,require:(name:string)=>{assert.equal(name,'react');return {
   useState:(initial:unknown)=>{const slot=index++;states[slot]=slot===1?true:initial;return [states[slot],(value:unknown)=>{states[slot]=value;}];},
   useRef:(initial:unknown)=>({current:initial}),useCallback:(fn:unknown)=>fn,useEffect:()=>{}
  };},Response,URLSearchParams,AbortController,AbortSignal,
  URL:{createObjectURL:()=> 'blob:isolated-voice',revokeObjectURL:()=>{}},
  AudioContext:class{async resume(){} async close(){}},
  Audio:class{async play(){} pause(){} removeAttribute(){} load(){}},
  window:{dispatchEvent:()=>{}},CustomEvent:class{},
  sessionStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},
  setInterval:()=>1,clearInterval:()=>{},
  setTimeout:(fn:()=>void,ms:number)=>{if(ms<120000){if(options.hold)release=fn;else queueMicrotask(fn);}return 1;},clearTimeout:()=>{},
  fetch:async(path:string,init?:RequestInit)=>{
   calls.push({path,body:init?.body?JSON.parse(init.body as string):undefined});
   if(path.startsWith('/api/voice/transcribe'))return Response.json({success:!(pending&&options.revoke)},{status:pending&&options.revoke?403:200});
   if(path.startsWith('/api/clara/chat')){const response=await chat(++attempt);pending=response.status===202;return response;}
   if(path.startsWith('/api/clara/conversation'))return options.history?.()??Response.json({success:true,messages:[answer]});
   if(path.startsWith('/api/voice/speak'))return new Response('ID3-synthetic',{headers:{'Content-Type':'audio/mpeg'}});
   throw Error('Unexpected isolated request');
  }
 });
 const voice=(exports.useClaraRuntimeVoice as(d:boolean,s:unknown)=>{toggle:()=>Promise<void>})(false,scope);
 return {voice,states,calls,storage,release:()=>release?.()};
}
const completed=()=>Response.json({success:true,conversation:[answer]},{headers:{'X-Clara-Operation-Completed':'1'}});
const pending=()=>Response.json({success:false,pendingRequest:operation},{status:202});
const submits=(h:ReturnType<typeof harness>)=>h.calls.filter(c=>c.path.startsWith('/api/clara/chat'));
const speaks=(h:ReturnType<typeof harness>)=>h.calls.filter(c=>c.path.startsWith('/api/voice/speak'));

test('202 replay retains exact operation/session/text and speaks only the verified saved reply',async()=>{
 const h=harness(async n=>n<3?pending():completed());await h.voice.toggle();
 assert.equal(submits(h).length,3);for(const call of submits(h))assert.deepEqual(call.body,operation);
 assert.equal(speaks(h).length,1);assert.deepEqual(speaks(h)[0].body,{messageId:answer.id});
 assert.equal(h.storage.size,0);assert.equal(h.states[0],'speaking');
});
test('native completion replay does not allocate a fresh cognitive operation',async()=>{
 const h=harness(async()=>Response.json({success:true,conversation:[answer]},{headers:{'X-Clara-Operation-Replayed':'1'}}));await h.voice.toggle();
 assert.equal(submits(h).length,1);assert.equal(h.states[0],'speaking');
});
test('pending recovery is bounded and retains the receipt without synthesis',async()=>{
 const h=harness(async()=>pending());await h.voice.toggle();
 assert.equal(submits(h).length,9);assert.equal(speaks(h).length,0);assert.equal(h.storage.size,1);assert.equal(h.states[0],'error');
});
test('uncertain network completion has no blind replay and retains the original receipt',async()=>{
 const h=harness(async()=>{throw Error('Connection lost');});await h.voice.toggle();
 assert.equal(submits(h).length,1);assert.equal(h.storage.size,1);assert.equal(speaks(h).length,0);
});
test('200 without native finalization cannot authorize TTS or discard its receipt',async()=>{
 const h=harness(async()=>Response.json({success:true,conversation:[answer]}));await h.voice.toggle();
 assert.equal(h.storage.size,1);assert.equal(speaks(h).length,0);
});
test('a pending receipt with different identity, session or transcript is refused',async()=>{
 for(const changed of [{operationId:'other-turn'},{sessionId:'other-session'},{message:'Other words'}]){
  const h=harness(async()=>Response.json({pendingRequest:{...operation,...changed}},{status:202}));await h.voice.toggle();
  assert.equal(submits(h).length,1);assert.equal(h.storage.size,1);assert.equal(speaks(h).length,0);
 }
});
test('history outage and unrelated later reply cannot substitute the response',async()=>{
 for(const history of [()=>Response.json({success:false},{status:503}),()=>Response.json({success:true,messages:[{...answer,id:'other-answer'}]})]){
  const h=harness(async()=>completed(),{history});await h.voice.toggle();assert.equal(h.storage.size,1);assert.equal(speaks(h).length,0);
 }
});
test('finalized failure closes the receipt without speaking',async()=>{
 const h=harness(async()=>Response.json({success:false},{status:422,headers:{'X-Clara-Operation-Completed':'1'}}));await h.voice.toggle();
 assert.equal(h.storage.size,0);assert.equal(speaks(h).length,0);
});
test('button interruption stops recovery and keeps its native receipt',async()=>{
 const h=harness(async()=>pending(),{hold:true});const running=h.voice.toggle();
 for(let i=0;i<20&&!submits(h).length;i++)await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));await h.voice.toggle();h.release();await running;
 assert.equal(submits(h).length,1);assert.equal(h.storage.size,1);assert.equal(speaks(h).length,0);assert.equal(h.states[0],'idle');
});
test('revocation between pending reads blocks both replay and synthesis',async()=>{
 const h=harness(async()=>pending(),{revoke:true});await h.voice.toggle();
 assert.equal(submits(h).length,1);assert.equal(h.storage.size,1);assert.equal(speaks(h).length,0);assert.equal(h.states[1],false);
});
