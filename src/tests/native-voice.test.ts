import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {RegistryError} from '../lib/canonical/registry';
import {nativeFailure} from '../lib/native/authority';
function load(file:string,modules:Record<string,unknown>,globals:Record<string,unknown>={}){
 const exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{if(!(name in modules))throw Error('Unexpected module '+name);return modules[name];},Request,Response,URL,AbortController,setInterval,clearInterval,...globals});return exports;
}
const scope={workspaceId:'w',clientId:'c',projectId:'p',sessionId:'s',digest:'not-a-real-token'};
const request=()=>new Request('https://fixture.invalid/api/voice/transcribe?sessionId=s',{headers:{'x-clara-native-voice':'1'}});
test('native voice requires current operator, writable project and certified thread; rejects revoked checks and aborted requests',async()=>{
 let operator=true,certified=true,revoked=false,checks=0;let tick:(()=>void)|undefined;
 const mod=load('src/lib/native/voice.ts',{
  '@/lib/auth/canonical-request-authorization':{authorizeClaraRequest:async(_cookie:unknown,w:string,p:string)=>{assert.equal(w,'w');assert.equal(p,'connections:manage');return operator?{userId:'actor'}:null;}},
  '@/lib/canonical/http':{sameOrigin:()=>{}},'@/lib/canonical/registry':{RegistryError},
  './authority':{nativeSelectors:()=>scope,nativeFailure},
  './scoped-context':{nativeCommand:async(_scope:unknown,op:string)=>{checks++;assert.equal(op,'write');if(revoked)throw new RegistryError(403,'NATIVE_SCOPE_DENIED');return {session:{}};},hydrateNative:(v:unknown)=>v,nativeThreadCertified:()=>certified}
 },{setInterval:(fn:()=>void)=>{tick=fn;return 1;},clearInterval:()=>{}});
 const authorize=mod.authorizeNativeVoice as(r:Request)=>Promise<unknown>;
 const operation=mod.nativeVoiceOperation as(r:Request,f:(s:unknown,signal:AbortSignal)=>Promise<Response>)=>Promise<Response>;
 assert.deepEqual(await authorize(request()),scope);
 operator=false;await assert.rejects(authorize(request()),/NATIVE_VOICE_OPERATOR_REQUIRED/);operator=true;
 certified=false;await assert.rejects(authorize(request()),/NATIVE_THREAD_REVIEW_REQUIRED/);certified=true;
 const positive=await operation(request(),async()=>Response.json({success:true}));assert.equal(positive.status,200);assert.equal(positive.headers.get('cache-control'),'no-store');
 let seenAbort=false;
 const pending=operation(request(),async(_s,signal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{seenAbort=true;reject(Error('provider aborted'));},{once:true})));
 await new Promise(resolve=>setImmediate(resolve));revoked=true;tick!();
 assert.equal((await pending).status,403);assert.equal(seenAbort,true);assert.ok(checks>=4);
 revoked=false;const abort=new AbortController();abort.abort();assert.equal((await operation(new Request(request(),{signal:abort.signal}),async()=>{throw Error('Must not call provider');})).status,409);
});
test('native synthesis only accepts a Clara message read from the exact authorized history; no browser text or foreign message',async()=>{
 const spoken:string[]=[];const handler=load('src/app/api/voice/speak/route.ts',{
  '@/lib/native/voice':{hasNativeVoiceScope:()=>true,nativeVoiceOperation:async(_r:Request,fn:(s:unknown,signal:AbortSignal)=>Promise<Response>)=>{try{return await fn(scope,new AbortController().signal);}catch(e){return nativeFailure(e);}}},
  '@/lib/native/scoped-context':{nativeCommand:async(s:unknown,op:string)=>{assert.equal(s,scope);assert.equal(op,'history');return {messages:[{id:'clara-a',role:'clara',content:'Authorized answer'},{id:'user-a',role:'user',content:'Not an answer'}]};}},
  '@/lib/canonical/registry':{RegistryError},'next-intl/server':{getTranslations:async()=>((key:string)=>key)},'next/server':{NextResponse:Response},
  '@/lib/auth/voice-request-authorization':{authorizeVoiceRequest:async()=>{throw Error('No legacy authority fallback');}},
  '@/lib/config/elevenlabs':{elevenLabsConfig:{voiceId:'synthetic-voice'}},
  '@/lib/connectors/internal/elevenlabs/elevenlabs-engine':{ElevenLabsEngine:class{async textToSpeech(c:{text:string},signal:AbortSignal){assert.ok(signal);spoken.push(c.text);return {success:true,audioBuffer:new Uint8Array([1,2]).buffer};}}}
 }).POST as(r:Request)=>Promise<Response>;
 const call=(body:unknown)=>handler(new Request('https://fixture.invalid/api/voice/speak',{method:'POST',body:JSON.stringify(body)}));
 assert.equal((await call({messageId:'clara-a'})).status,200);
 for(const body of [{text:'Arbitrary'},{messageId:'foreign'},{messageId:'user-a'},{messageId:'clara-a',text:'Injected'}])assert.ok((await call(body)).status>=400);
 assert.deepEqual(spoken,['Authorized answer']);
});

test('native readiness stays closed without provider configuration or in protected Recette, without a provider call',async()=>{
 const config:{apiKey?:string;voiceId?:string}={apiKey:'synthetic',voiceId:'synthetic'};let recette=false;
 const handlers=load('src/app/api/voice/transcribe/route.ts',{
  '@/lib/native/voice':{hasNativeVoiceScope:()=>true,nativeVoiceOperation:async(_r:Request,fn:()=>Promise<Response>)=>{try{return await fn();}catch(e){return nativeFailure(e);}}},
  'next-intl/server':{getTranslations:async()=>((key:string)=>key)},'next/server':{NextResponse:Response},
  '@/lib/auth/voice-request-authorization':{authorizeVoiceRequest:()=>{throw Error('No legacy fallback');}},
  '@/lib/config/elevenlabs':{elevenLabsConfig:config},
  '@/lib/recette/external-execution-guard':{assertRecetteExternalExecutionBlocked:()=>{if(recette)throw Error('RECETTE_EXTERNAL_EXECUTION_DENIED');}}
 }).GET as(r:Request)=>Promise<Response>;
 assert.equal((await handlers(request())).status,200);
 config.voiceId=undefined;assert.equal((await handlers(request())).status,503);
 config.voiceId='synthetic';config.apiKey=undefined;assert.equal((await handlers(request())).status,503);
 config.apiKey='synthetic';recette=true;assert.equal((await handlers(request())).status,503);
});

test('voice recovery adopts the existing native pending receipt on 202 without recording or repeating a supplier call',async()=>{
 const scope={workspaceId:'w',clientId:'c',projectId:'p',sessionId:'native:fixture'};
 const key='clara.pending-chat:'+scope.sessionId,storage=new Map([[key,JSON.stringify({operationId:'original-retry-001',sessionId:scope.sessionId,message:'Original retry'})]]);
 const pending={operationId:'server-pending-001',sessionId:scope.sessionId,message:'Actual pending request'};let stateIndex=0;const calls:string[]=[];
 const voiceModule=load('src/components/clara/useClaraRuntimeVoice.ts',{
  react:{useState:(value:unknown)=>[stateIndex++===1?true:value,()=>{}],useRef:(value:unknown)=>({current:value}),useCallback:(fn:unknown)=>fn,useEffect:()=>{}}
 },{
  window:{dispatchEvent:()=>{}},CustomEvent:class{},
  URLSearchParams,AbortSignal,
  sessionStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},
  setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},
  fetch:async(path:string)=>{calls.push(path.split('?')[0]);if(path.startsWith('/api/voice/transcribe'))return Response.json({success:true});if(path.startsWith('/api/clara/chat'))return Response.json({pendingRequest:pending},{status:202});throw Error('No provider call during pending recovery');}
 });
 const hook=voiceModule.useClaraRuntimeVoice as(disabled:boolean,scope:unknown)=>{toggle:()=>Promise<void>};
 await hook(false,scope).toggle();assert.deepEqual(JSON.parse(storage.get(key)!),pending);
 assert.deepEqual(calls,['/api/voice/transcribe','/api/voice/transcribe','/api/clara/chat']);
});
