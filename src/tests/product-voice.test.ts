import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {RegistryError} from '../lib/canonical/registry';
import {nativeFailure} from '../lib/native/authority';

function load(file:string,modules:Record<string,unknown>){
 const exports:Record<string,unknown>={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(name:string)=>{if(!(name in modules))throw Error('Unexpected module '+name);return modules[name];},fetch:()=>{throw Error('No external fetch in isolated test');},Request,Response,URL,AbortController,Buffer,File,FormData,TextDecoder,Uint8Array,setInterval,clearInterval});return exports;
}
type Callback={action:string;status?:string;claims:Record<string,unknown>;output_sha256?:string};
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const token='synthetic-product-voice-token-not-a-secret';
function harness(){
 const product={productId:'clara-live',workspaceId:'workspace-a',token,capabilities:['voice:conversation'],callbackBaseUrl:'https://live.example.test'};
 const config={apiKey:'synthetic-voice',voiceId:'synthetic-voice'};
 const calls:Callback[]=[],spoken:string[]=[];let allowed=true,revoked=false,recette=false,proofValid=true,ack=true,transcriptions=0,consumed=false;
 let synthesize=async(text:string,signal:AbortSignal)=>{assert.equal(signal.aborted,false);spoken.push(text);return new Uint8Array([10,11]).buffer;};
 const native=load('src/lib/native/voice.ts',{
  '@/lib/auth/canonical-request-authorization':{},'@/lib/canonical/http':{},'@/lib/canonical/registry':{RegistryError},'./authority':{nativeFailure},'./scoped-context':{},
 });
 class VoiceTranscriptionError extends Error {}
 const module=load('src/lib/voice/product-voice.ts',{
  'node:crypto':{createHash},'@/lib/external-capabilities/config':{authenticateExternalProduct:()=>allowed?product:null},
  '@/lib/canonical/live-bridge':{createLiveCanonicalTransport:()=>async()=>{throw Error('No implicit callback');}},
  '@/lib/canonical/registry':{RegistryError},'@/lib/native/voice':native,
  '@/lib/config/elevenlabs':{elevenLabsConfig:config},
  '@/lib/connectors/internal/elevenlabs/elevenlabs-engine':{ElevenLabsEngine:class{}},
  '@/lib/recette/external-execution-guard':{assertRecetteExternalExecutionBlocked:()=>{if(recette)throw Error('Synthetic blocked environment');}},
  './transcription':{VoiceTranscriptionError,transcribeVoiceAudio:async()=>{throw Error('No implicit provider');}},
 });
 const factory=module.createProductVoiceHandlers as (d:unknown)=>{readiness:(r:Request)=>Promise<Response>;transcribe:(r:Request)=>Promise<Response>;speak:(r:Request)=>Promise<Response>};
 const handlers=factory({
  call:async(path:string,body:Callback)=>{
   assert.equal(path,'/api/core/voice/authorize');calls.push(body);
   if(body.action==='finish')return {acknowledged:ack};
   if(revoked)throw new RegistryError(403,'VOICE_SESSION_EXPIRED_OR_REVOKED');
   if(body.action==='consume'){if(consumed)throw new RegistryError(403,'VOICE_DELEGATION_DENIED');consumed=true;}
   const c=body.claims;
   return {authorized:proofValid,delegation_id:c.delegationId,operation_id:c.operationId,input_sha256:c.inputSha256,...(c.operation==='speak'?{text:'Réponse enregistrée.'}:{})};
  },
  transcribe:async(_file:File,signal:AbortSignal)=>{transcriptions++;assert.equal(signal.aborted,false);return {text:'Question reconnue.',language:'fr'};},
  synthesize:(text:string,signal:AbortSignal)=>synthesize(text,signal),
 });
 const claims=(operation='transcribe')=>({productId:'clara-live',userId:'actor-a',workspaceId:'workspace-a',projectId:'project-a',sessionId:'conversation-a',locale:'fr',permissions:['voice:conversation'],delegationId:'voice_'+'a'.repeat(40),issuedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+90_000).toISOString(),voiceSessionId:'vsn_a',operationId:'op_a',operation,inputSha256:hash(operation==='speak'?'Réponse enregistrée.':'synthetic-audio'),...(operation==='speak'?{utteranceId:'stt-a',messageId:'answer-a'}:{})});
 const request=(c:Record<string,unknown>=claims(),body?:BodyInit)=>{
  const headers=new Headers({'x-clara-voice-delegation':Buffer.from(JSON.stringify({claims:c,signature:'b'.repeat(64)})).toString('base64url')});
  if(c.operation==='speak')headers.set('Content-Type','application/json');
  if(body===undefined){if(c.operation==='speak')body='{}';else{const form=new FormData();form.append('audio',new File(['synthetic-audio'],'voice.webm',{type:'audio/webm'}));body=form;}}
  return new Request('https://os.example.test/api/core/voice/'+c.operation,{method:'POST',headers,body});
 };
 return {handlers,claims,request,product,config,calls,spoken,get transcriptions(){return transcriptions;},set allowed(v:boolean){allowed=v;},set revoked(v:boolean){revoked=v;},set recette(v:boolean){recette=v;},set proofValid(v:boolean){proofValid=v;},set ack(v:boolean){ack=v;},set synthesize(fn:typeof synthesize){synthesize=fn;}};
}

test('product voice is denied without product, explicit voice grant, callback, credential or provider configuration; readiness never calls a provider',async()=>{
 for(const missing of ['product','capability','callback','credential','api','voice','recette']){
  const h=harness();if(missing==='product')h.allowed=false;
  if(missing==='capability')h.product.capabilities=['conversation:link'];
  if(missing==='callback')h.product.callbackBaseUrl='';if(missing==='credential')h.product.token='short';
  if(missing==='api')h.config.apiKey='';if(missing==='voice')h.config.voiceId='';if(missing==='recette')h.recette=true;
  const response=await h.handlers.readiness(new Request('https://os.example.test/api/core/voice/readiness',{method:'POST',body:'{}'}));
  assert.ok(response.status>=400,missing);assert.equal(h.calls.length,0);assert.equal(h.transcriptions,0);assert.equal(response.headers.get('cache-control'),'no-store');
 }
 const h=harness();const response=await h.handlers.readiness(new Request('https://os.example.test/api/core/voice/readiness',{method:'POST',body:'{}'}));
 assert.deepEqual(await response.json(),{success:true,workspace_id:'workspace-a',provider_checked:false});assert.equal(h.calls.length,0);
});

test('bounded audio requires the issued content hash and a current consumed Live proof before shared STT; completion is acknowledged and rechecked',async()=>{
 const h=harness();const response=await h.handlers.transcribe(h.request());assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{success:true,text:'Question reconnue.',language:'fr'});assert.equal(h.transcriptions,1);
 assert.deepEqual(h.calls.map(call=>call.action),['consume','finish','check']);assert.equal(h.calls[1].output_sha256,hash('Question reconnue.'));
 const replay=await h.handlers.transcribe(h.request());assert.equal(replay.status,403);assert.equal(h.transcriptions,1);
});

test('foreign workspace, wrong operation, permissions, invalid expiry, content alteration and arbitrary synthesis text refuse without provider IO',async()=>{
 const cases:Record<string,unknown>[]=[{workspaceId:'workspace-b'},{operation:'speak'},{permissions:['conversation:link']},{issuedAt:{}},{expiresAt:new Date(Date.now()-1).toISOString()},{issuedAt:'2026-01-01'},{inputSha256:hash('altered')}];
 for(const change of cases){const h=harness();const response=await h.handlers.transcribe(h.request({...h.claims(),...change}));assert.ok(response.status>=400,JSON.stringify(change));assert.equal(h.transcriptions,0);assert.equal(h.calls.length,0);}
 const h=harness();const response=await h.handlers.speak(h.request(h.claims('speak'),JSON.stringify({text:'Arbitrary text'})));assert.equal(response.status,400);assert.equal(h.spoken.length,0);
});

test('only exact persisted assistant narrative may be synthesized; no text supplied by the browser and no private provider diagnostics',async()=>{
 const h=harness();const response=await h.handlers.speak(h.request(h.claims('speak')));assert.equal(response.status,200);assert.deepEqual(h.spoken,['Réponse enregistrée.']);assert.equal(response.headers.get('content-type'),'audio/mpeg');assert.equal(response.headers.get('cache-control'),'no-store');
 const failed=harness();failed.synthesize=async()=>{throw Error('Private provider secret');};const refusal=await failed.handlers.speak(failed.request(failed.claims('speak')));assert.ok(refusal.status>=400);assert.ok(!(await refusal.text()).includes('Private'));assert.equal(failed.calls.at(-1)?.status,'failed');
});

test('malformed Live proof and unconfirmed completion never release audio; cleanup is attempted even when consume response was lost',async()=>{
 const bad=harness();bad.proofValid=false;assert.equal((await bad.handlers.speak(bad.request(bad.claims('speak')))).status,403);assert.equal(bad.spoken.length,0);assert.equal(bad.calls.at(-1)?.action,'finish');
 const uncertain=harness();uncertain.ack=false;const response=await uncertain.handlers.speak(uncertain.request(uncertain.claims('speak')));assert.equal(response.status,503);assert.equal(response.headers.get('content-type'),'application/json');assert.equal(uncertain.spoken.length,1);assert.equal(uncertain.calls.filter(call=>call.action==='consume').length,1);
});

test('revocation during provider work aborts its signal and releases neither partial nor complete audio, without retry',async()=>{
 const h=harness();let aborted=false;
 h.synthesize=async(_text,signal)=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(Error('Aborted provider'));},{once:true});h.revoked=true;});
 const response=await h.handlers.speak(h.request(h.claims('speak')));assert.equal(response.status,403);assert.equal(aborted,true);assert.equal(h.calls.filter(call=>call.action==='consume').length,1);assert.equal(h.calls.at(-1)?.status,'failed');
});
