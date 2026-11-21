/** Actual product audio handlers over loopback HTTP, simulated suppliers only.
 * Opt-in reception adapter. No credentials or callbacks from deployed systems.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {randomUUID} from 'node:crypto';

const runtime=process.env.PRODUCT_VOICE_FIXTURE_DIR;
assert.equal(process.env.PRODUCT_VOICE_HTTP_RECEPTION,'1');
assert.ok(runtime?.startsWith('/workspace/clara-voice-live-runtime-'));
const settings=JSON.parse(readFileSync(runtime+'/os-fixture.json','utf8')) as {liveOrigin:string};
assert.match(settings.liveOrigin,/^https:\/\/127\.0\.0\.1:\d+$/);
const token='synthetic-product-voice-token-not-a-secret';
Object.assign(process.env,{DATABASE_URL:'postgresql://synthetic:synthetic@documents-e2e.invalid/synthetic',POSTGRES_URL:'',CLARA_LIVE_PRODUCT_TOKEN:token,CLARA_LIVE_WORKSPACE_ID:'voice-workspace',CLARA_LIVE_CAPABILITIES:'["voice:conversation"]',CLARA_LIVE_CALLBACK_BASE_URL:'https://voice-live.fixture.example',CLARA_EXTERNAL_PRODUCTS_JSON:'{}',ELEVENLABS_API_KEY:'synthetic-voice-test-only',ELEVENLABS_VOICE_ID:'synthetic-voice'});
const originalFetch=globalThis.fetch;
const statePath=runtime+'/os-provider-state.json';
type State={calls:string[];delayMs?:number;seconds?:number;failStt?:boolean;aborted?:number};
const state=()=>JSON.parse(readFileSync(statePath,'utf8')) as State;
const save=(value:State)=>{const path=statePath+'.'+randomUUID();writeFileSync(path,JSON.stringify(value));renameSync(path,statePath);};
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.hostname==='voice-live.fixture.example'){
  assert.equal(url.pathname,'/api/core/voice/authorize');assert.equal(init?.method,'POST');
  return originalFetch(settings.liveOrigin+url.pathname,init);
 }
 if(url.hostname!=='api.elevenlabs.io')throw Error('All external network blocked by this explicit provider fixture');
 const method=url.pathname;assert.ok(['/v1/speech-to-text','/v1/text-to-speech/synthetic-voice'].includes(method));
 const current=state();current.calls.push(method);save(current);
 await new Promise<void>((resolve,reject)=>{
  const signal=init?.signal;
  const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);const latest=state();latest.aborted=(latest.aborted??0)+1;save(latest);reject(new DOMException('Synthetic cancelled supplier','AbortError'));};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},current.delayMs??0);
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 });
 if(method.endsWith('speech-to-text'))return current.failStt?Response.json({error:'Synthetic supplier unavailable'},{status:503}):Response.json({text:'Présente les étapes autorisées de ce projet, sans modification.',language_code:'fr'});
 const rate=8000,seconds=current.seconds??1,samples=Buffer.alloc(Math.floor(rate*seconds)*2),wav=Buffer.alloc(44+samples.length);
 for(let i=0;i<samples.length/2;i++)samples.writeInt16LE(Math.round(4000*Math.sin(2*Math.PI*220*i/rate)),i*2);
 wav.write('RIFF',0);wav.writeUInt32LE(36+samples.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length,40);samples.copy(wav,44);
 return new Response(wav,{headers:{'Content-Type':'audio/wav'}});
};

async function main(){
 const {createProductVoiceHandlers}=await import('../../lib/voice/product-voice');
 const handlers=createProductVoiceHandlers();
 const routes=new Map([['/api/core/voice/readiness',handlers.readiness],['/api/core/voice/transcribe',handlers.transcribe],['/api/core/voice/speak',handlers.speak]]);
 const cognitiveJobs=new Map<string,{event:Record<string,unknown>;response:string}>();
 const server=createServer({key:readFileSync(runtime+'/test.key'),cert:readFileSync(runtime+'/test.crt')},async(incoming,outgoing)=>{
  const abort=new AbortController();outgoing.on('close',()=>{if(!outgoing.writableEnded)abort.abort();});
  try{
   const chunks:Buffer[]=[];let size=0;for await(const chunk of incoming){size+=chunk.length;assert.ok(size<=4_000_000);chunks.push(Buffer.from(chunk));}
   const body=Buffer.concat(chunks),headers=new Headers();for(const [name,value]of Object.entries(incoming.headers))if(value!==undefined)headers.set(name,Array.isArray(value)?value.join(','):value);
   const path=new URL(incoming.url??'/', 'http://127.0.0.1').pathname;
   let response:Response;
   if(path==='/api/external/events'){
    assert.equal(headers.get('authorization'),'Bearer '+token);assert.equal(headers.get('x-clara-product'),'clara-live');
    const event=JSON.parse(body.toString('utf8'));
    response=Response.json({success:true,data:{sessionId:event.scope.sessionId,response:'Réponse de recette isolée : seules les données autorisées du projet sont utilisées. Votre validation reste nécessaire.'}});
   }else if(path.startsWith('/api/external/event-jobs')){
    // Existing event-job wire protocol. Cognition is EXPLICITLY simulated;
    // native OS cognition/SQL are received separately by the native browser test.
    assert.equal(headers.get('authorization'),'Bearer '+token);assert.equal(headers.get('x-clara-product'),'clara-live');
    const input=JSON.parse(body.toString('utf8'));
    if(path==='/api/external/event-jobs'){
     const prior=cognitiveJobs.get(input.jobId);
     if(prior)assert.deepEqual(prior.event,input.event);
     else cognitiveJobs.set(input.jobId,{event:input.event,response:'Réponse de recette isolée : les étapes documentées restent soumises à votre validation. Aucun équipement n’est commandé.'});
    }
    const job=cognitiveJobs.get(input.jobId);
    response=job?Response.json({success:true,data:{jobId:input.jobId,status:'completed',phase:'completed',result:{sessionId:(job.event.scope as {sessionId:string}).sessionId,response:job.response}}}):Response.json({success:false,code:'EVENT_JOB_NOT_FOUND'},{status:404});
   }else{
    const handler=routes.get(path);if(!handler){outgoing.writeHead(404);outgoing.end();return;}
    response=await handler(new Request('https://127.0.0.1'+path,{method:incoming.method,headers,body:new Uint8Array(body),signal:abort.signal}));
   }
   outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){console.error('Voice fixture request failed',error instanceof Error?error.name:'Error');if(!outgoing.headersSent)outgoing.writeHead(500);outgoing.end();}
 });
 server.listen(0,'127.0.0.1',()=>{const address=server.address();if(address&&typeof address!=='string')console.info(JSON.stringify({test_origin:'https://127.0.0.1:'+address.port}));});
 process.on('SIGTERM',()=>{server.closeAllConnections();server.close(()=>process.exit(0));});
}
void main().catch(()=>{console.error('Isolated voice fixture failed');process.exitCode=1;});
