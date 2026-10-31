import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import vm from "node:vm";
import ts from "typescript";
import {createTranslator} from "next-intl";
import {isSameOriginRequest} from "../lib/auth/session-request-security";

function load(file:string,modules:Record<string,unknown>,fetcher:typeof fetch){
 const exports:Record<string,unknown>={},require=createRequire(resolve(file));
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>modules[name]??require(name),fetch:fetcher,File,FormData,Response,Request,URL,Headers,process:{env:{CLARA_AUTH_APP_ORIGIN:'https://fixture.invalid'}}});
 return exports;
}
const noNetwork:typeof fetch=async()=>{throw new Error('Unexpected network request in isolated security test');};

test('voice authorization uses existing server-owned workspace and operator permissions, rejects foreign origin before auth',async()=>{
 let calls=0;const seen:unknown[]=[];
 const loaded=load('src/lib/auth/voice-request-authorization.ts',{
  './canonical-request-authorization':{authorizeClaraRequest:async(...args:unknown[])=>{calls++;seen.push(args);return args[0]==='canonical-session'?{userId:'synthetic',workspaceId:'workspace-A'}:null;}},
  './session-request-security':{isSameOriginRequest},
  '@/lib/connections/current-workspace':{CURRENT_WORKSPACE_ID:'workspace-A'}
 },noNetwork);
 const authorize=loaded.authorizeVoiceRequest as(request:Request)=>Promise<boolean>;
 assert.equal(await authorize(new Request('https://fixture.invalid/api/telephony',{method:'POST',headers:{origin:'https://foreign.invalid',cookie:'canonical-session'}})),false);assert.equal(calls,0);
 assert.equal(await authorize(new Request('https://fixture.invalid/api/telephony',{method:'POST',headers:{origin:'https://fixture.invalid',cookie:'canonical-session'}})),true);
 assert.deepEqual(JSON.parse(JSON.stringify(seen[0])),['canonical-session','workspace-A','connections:manage']);
 assert.equal(await authorize(new Request('https://fixture.invalid/api/telephony',{method:'POST',headers:{origin:'https://fixture.invalid',cookie:'caller-workspace-B'}})),false);
});

test('four provider routes deny unauthenticated requests before any provider and localize secret-free failures in five languages',async()=>{
 let locale='fr',authorized=false,calls=0;
 const translate=async(namespace:string)=>createTranslator({locale,messages:JSON.parse(readFileSync(`src/i18n/messages/${locale}/index.json`,'utf8')),namespace});
 const providerFetch:typeof fetch=async()=>{calls++;return Response.json({detail:'PRIVATE_PROVIDER_SECRET'}, {status:401});};
 const modules:Record<string,unknown>={
  'next/server':{NextResponse:Response},'next-intl/server':{getTranslations:translate},
  '@/lib/auth/voice-request-authorization':{authorizeVoiceRequest:async()=>authorized},
  '@/lib/config/elevenlabs':{elevenLabsConfig:{apiKey:'synthetic-key',agentId:'synthetic-agent',voiceId:'synthetic-voice'}},
  '@/lib/connectors/internal/elevenlabs/elevenlabs-engine':{ElevenLabsEngine:class{async textToSpeech(){calls++;return {success:false,error:'PRIVATE_PROVIDER_SECRET'};}}},
  '@/lib/connectors/internal/telephony':{TELEPHONY_MODULE:{engine:{execute:async()=>{calls++;return {success:false,error:'PRIVATE_PROVIDER_SECRET'};}}}}
 };
 const routes=[['src/app/api/telephony/route.ts','POST'],['src/app/api/elevenlabs/session/route.ts','GET'],['src/app/api/voice/speak/route.ts','POST'],['src/app/api/voice/transcribe/route.ts','POST']] as const;
 const handlers=routes.map(([file,method])=>load(file,modules,providerFetch)[method] as(request:Request)=>Promise<Response>);
 function request(index:number){if(index===1)return new Request('https://fixture.invalid/api/elevenlabs/session');if(index===3){const form=new FormData();form.append('audio',new File(['synthetic audio'],'sample.webm'));return new Request('https://fixture.invalid/api/voice/transcribe',{method:'POST',body:form});}return new Request('https://fixture.invalid/api/voice',{method:'POST',body:JSON.stringify({text:'Synthetic text',toNumber:'+33000000000'})});}
 for(let i=0;i<handlers.length;i++)assert.equal((await handlers[i](request(i))).status,403);assert.equal(calls,0);
 authorized=true;
 for(locale of ['fr','en','es','de','it']){
  const voice=await translate('voiceApi'),phone=await translate('telephony');
  for(let i=0;i<handlers.length;i++){
   const response=await handlers[i](request(i));const body=await response.json();assert.equal(response.status,502);
   assert.equal(body.error??body.message,i===0?phone('callError'):voice(i===1?'sessionUnavailable':i===2?'synthesisFailed':'transcriptionFailed'));
   assert.ok(!JSON.stringify(body).includes('PRIVATE_PROVIDER_SECRET'));assert.ok(!('detail' in body));
  }
 }
 assert.equal(calls,20);
});

// Execute the actual legacy widget handlers with an injected SDK. This is an
// offline reproducer, not a supplier or native persistence certification.
function cockpitVoiceHarness() {
 type Node={type:unknown;props:Record<string,unknown>};
 const slots:unknown[]=[];let cursor=0,microphone=0,starts=0,ends=0;
 const requests:string[]=[];const callbacks:Array<Record<string,unknown>>=[];
 const slot=(initial:unknown)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return i;};
 const exports:Record<string,unknown>={};
 const jsx=(type:unknown,props:Record<string,unknown>):Node=>({type,props});
 const modules:Record<string,unknown>={
  react:{useState:(initial:unknown)=>{const i=slot(initial);return [slots[i],(value:unknown)=>{slots[i]=value;}];},useRef:(initial:unknown)=>{const i=slot({current:initial});return slots[i];}},
  'react/jsx-runtime':{jsx,jsxs:jsx},
  'next-intl':{useTranslations:()=>((key:string)=>key)},
  'lucide-react':{Mic:()=>null},
  '@elevenlabs/client':{Conversation:{startSession:async(options:Record<string,unknown>)=>{starts++;callbacks.push(options);(options.onConnect as ()=>void)();return {endSession:async()=>{ends++;(options.onDisconnect as ()=>void)();}};}}}
 };
 vm.runInNewContext(ts.transpileModule(readFileSync('src/components/cockpit/widgets/voice/ClaraVoiceWidget.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports,require:(name:string)=>{if(!(name in modules))throw Error('Unexpected widget dependency');return modules[name];},
  navigator:{mediaDevices:{getUserMedia:async()=>{microphone++;return {getTracks:()=>[]};}}},
  fetch:async(url:string)=>{requests.push(url);assert.equal(url,'/api/elevenlabs/session');return Response.json({success:true,signedUrl:'wss://synthetic.invalid/offline'});},
  console:{error:()=>{throw Error('Unexpected widget error');}}
 });
 return {
  render(disabled:boolean){cursor=0;return (exports.default as (props:{disabled:boolean})=>Node)({disabled});},
  click(node:Node){return (node.props.onClick as ()=>Promise<void>)();},
  metrics:()=>({microphone,starts,ends,requests:[...requests]}),callbacks
 };
}

test('native voice guard prevents microphone, signed URL and SDK startup in the actual cockpit handler',async()=>{
 const h=cockpitVoiceHarness(),button=h.render(true);
 assert.equal(button.props.disabled,true);
 await h.click(button); // Even a direct handler invocation cannot bypass it.
 assert.deepEqual(h.metrics(),{microphone:0,starts:0,ends:0,requests:[]});
});

test('legacy cockpit SDK lifecycle reproducer distinguishes transport from native history, resume and revocation',async(t)=>{
 const h=cockpitVoiceHarness();await h.click(h.render(false));
 assert.deepEqual(h.metrics(),{microphone:1,starts:1,ends:0,requests:['/api/elevenlabs/session']});
 // Diagnose the exact current SDK handoff; do not call this a durable turn.
 const first=h.callbacks[0];
 assert.equal(typeof first.onConnect,'function');assert.equal(typeof first.onModeChange,'function');
 t.diagnostic('SDK handoff: onMessage='+String(typeof first.onMessage)+'; history requests='+h.metrics().requests.filter(x=>x.includes('conversation')||x.includes('chat')).length);
 await h.click(h.render(false));assert.equal(h.metrics().ends,1); // Manual stop exists.
 await h.click(h.render(false));assert.equal(h.metrics().starts,2); // Fresh session, not a demonstrated resume.
 const before=h.metrics().ends;h.render(true);
 t.diagnostic('Disabling an already active component: additional endSession calls='+(h.metrics().ends-before));
 // Keep the positive safety assertion: native mode never initiates another session.
 await h.click(h.render(true));assert.equal(h.metrics().starts,2);
 // Fixture cleanup uses the SDK callback, not a claimed server revocation.
 (h.callbacks[1].onDisconnect as ()=>void)();
});
