import {createHash} from 'node:crypto';
import {authenticateExternalProduct,type ExternalProductConfig} from '@/lib/external-capabilities/config';
import {createLiveCanonicalTransport} from '@/lib/canonical/live-bridge';
import {RegistryError} from '@/lib/canonical/registry';
import {bufferedVoiceOperation} from '@/lib/native/voice';
import {elevenLabsConfig} from '@/lib/config/elevenlabs';
import {ElevenLabsEngine} from '@/lib/connectors/internal/elevenlabs/elevenlabs-engine';
import {assertRecetteExternalExecutionBlocked} from '@/lib/recette/external-execution-guard';
import {transcribeVoiceAudio,VoiceTranscriptionError} from './transcription';

export const PRODUCT_VOICE_CAPABILITY='voice:conversation';
const MAX_BODY=4_000_000,MAX_AUDIO=3_000_000;
type Claims={productId:string;userId:string;workspaceId:string;projectId:string;sessionId:string;locale:string;permissions:string[];delegationId:string;issuedAt:string;expiresAt:string;voiceSessionId:string;operationId:string;operation:'transcribe'|'speak';inputSha256:string;utteranceId?:string;messageId?:string};
type Delegation={claims:Claims;signature:string};
type Proof={authorized:boolean;delegation_id:string;operation_id:string;input_sha256:string;text?:string};
type Dependencies={authenticate:(request:Request)=>ExternalProductConfig|null;call:(path:string,payload:unknown)=>Promise<unknown>;transcribe:typeof transcribeVoiceAudio;synthesize:(text:string,signal:AbortSignal)=>Promise<ArrayBuffer>};
const sha=(bytes:ArrayBuffer|string)=>createHash('sha256').update(typeof bytes==='string'?Buffer.from(bytes):Buffer.from(bytes)).digest('hex');
const failure=(error:unknown)=>{const e=error instanceof RegistryError?error:new RegistryError(503,'VOICE_SERVICE_UNAVAILABLE');return Response.json({success:false,code:e.code},{status:e.status,headers:{'Cache-Control':'no-store'}});};

async function boundedBody(request:Request,max=MAX_BODY){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const parts:Uint8Array[]=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>max)throw new RegistryError(413,'VOICE_INPUT_TOO_LARGE');parts.push(next.value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const all=new Uint8Array(size);let at=0;for(const part of parts){all.set(part,at);at+=part.length;}return all;
}
async function emptyBody(request:Request){const bytes=await boundedBody(request,4096);let value:unknown;try{value=bytes.length?JSON.parse(new TextDecoder().decode(bytes)):{};}catch{throw new RegistryError(400,'VOICE_REQUEST_INVALID');}if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length)throw new RegistryError(400,'VOICE_REQUEST_INVALID');}
function parseDelegation(request:Request,product:ExternalProductConfig,operation:Claims['operation']):Delegation{
 const raw=request.headers.get('x-clara-voice-delegation')??'';if(!raw||raw.length>8192||!/^[\w-]+$/.test(raw))throw new RegistryError(400,'VOICE_DELEGATION_REQUIRED');
 let value:Delegation;try{value=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));}catch{throw new RegistryError(400,'VOICE_DELEGATION_INVALID');}
 if(!value||Object.keys(value).sort().join(',')!=='claims,signature'||!/^[a-f0-9]{64}$/.test(value.signature??''))throw new RegistryError(400,'VOICE_DELEGATION_INVALID');
 const c=value.claims,keys=['productId','userId','workspaceId','projectId','sessionId','locale','permissions','delegationId','issuedAt','expiresAt','voiceSessionId','operationId','operation','inputSha256','utteranceId','messageId'];
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!keys.includes(k))||c.productId!=='clara-live'||c.workspaceId!==product.workspaceId||c.operation!==operation||JSON.stringify(c.permissions)!=='["voice:conversation"]'||!['fr','en','es','de','it'].includes(c.locale))throw new RegistryError(403,'VOICE_SCOPE_DENIED');
 for(const key of ['userId','projectId','sessionId','voiceSessionId','operationId','delegationId'] as const)if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>512)throw new RegistryError(400,'VOICE_DELEGATION_INVALID');
 if(!/^voice_[A-Za-z0-9_-]{20,100}$/.test(c.delegationId)||!/^[a-f0-9]{64}$/.test(c.inputSha256))throw new RegistryError(400,'VOICE_DELEGATION_INVALID');
 if(typeof c.issuedAt!=='string'||typeof c.expiresAt!=='string'||![c.issuedAt,c.expiresAt].every(value=>/(?:Z|[+-]\d{2}:\d{2})$/.test(value)))throw new RegistryError(400,'VOICE_DELEGATION_INVALID');
 const issued=Date.parse(c.issuedAt),expires=Date.parse(c.expiresAt),now=Date.now();if(!Number.isFinite(issued)||!Number.isFinite(expires)||issued>now||expires<=now||expires-issued>120_000||expires<=issued)throw new RegistryError(403,'VOICE_DELEGATION_EXPIRED');
 if(operation==='speak'&&[c.messageId,c.utteranceId].some(value=>typeof value!=='string'||!value.trim()||value.length>512))throw new RegistryError(400,'VOICE_REPLY_REQUIRED');
 return value;
}

/** Product-scoped audio IO only. Live remains authority for its user/project
 * and its existing conversation. No native OS identity or tool is granted. */
export function createProductVoiceHandlers(overrides:Partial<Dependencies>={}){
 const deps:Dependencies={
  authenticate:request=>authenticateExternalProduct(request.headers.get('x-clara-product'),request.headers.get('authorization')),
  call:createLiveCanonicalTransport(fetch,PRODUCT_VOICE_CAPABILITY),transcribe:transcribeVoiceAudio,
  synthesize:async(text,signal)=>{const result=await new ElevenLabsEngine().textToSpeech({operation:'text-to-speech',text,voiceId:elevenLabsConfig.voiceId},signal);if(!result.success||!result.audioBuffer)throw new RegistryError(502,'VOICE_SYNTHESIS_FAILED');return result.audioBuffer;},...overrides
 };
 function authorizedProduct(request:Request){
  const product=deps.authenticate(request);if(!product||product.productId!=='clara-live')throw new RegistryError(401,'VOICE_PRODUCT_REQUIRED');
  if(!product.capabilities.includes(PRODUCT_VOICE_CAPABILITY))throw new RegistryError(403,'VOICE_CAPABILITY_REQUIRED');
  if(!product.callbackBaseUrl||Buffer.byteLength(product.token)<32)throw new RegistryError(503,'VOICE_CONFIGURATION_REQUIRED');
  try{assertRecetteExternalExecutionBlocked('voice.product');}catch{throw new RegistryError(503,'VOICE_EXTERNAL_EXECUTION_BLOCKED');}
  if(!elevenLabsConfig.apiKey||!elevenLabsConfig.voiceId)throw new RegistryError(503,'VOICE_CONFIGURATION_REQUIRED');
  return product;
 }
 async function operate(request:Request,operation:Claims['operation']){
  let delegation:Delegation|undefined,consumed=false,attemptedConsume=false,finished=false;
  try{
   const product=authorizedProduct(request);delegation=parseDelegation(request,product,operation);const bound=delegation;
   let audio:File|undefined;
   if(operation==='transcribe'){
    const bytes=await boundedBody(request);const form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:bytes}).formData();
    if([...form.keys()].some(k=>k!=='audio')||form.getAll('audio').length!==1)throw new RegistryError(400,'VOICE_REQUEST_INVALID');
    const file=form.get('audio');if(!(file instanceof File)||file.size===0||file.size>MAX_AUDIO||!['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/x-wav'].some(type=>file.type.split(';')[0]===type))throw new RegistryError(422,'VOICE_AUDIO_INVALID');
    if(sha(await file.arrayBuffer())!==bound.claims.inputSha256)throw new RegistryError(422,'VOICE_INPUT_INTEGRITY');audio=file;
   }else await emptyBody(request);
   async function authorize(){
    const current=authorizedProduct(request);if(current.workspaceId!==bound.claims.workspaceId)throw new RegistryError(403,'VOICE_SCOPE_DENIED');
    attemptedConsume=true;
    const proof=await deps.call('/api/core/voice/authorize',{action:consumed?'check':'consume',...bound}) as Proof;
    if(proof?.authorized!==true||proof.delegation_id!==bound.claims.delegationId||proof.operation_id!==bound.claims.operationId||proof.input_sha256!==bound.claims.inputSha256)throw new RegistryError(403,'VOICE_PROOF_REQUIRED');
    if(operation==='speak'&&(typeof proof.text!=='string'||!proof.text.trim()||proof.text.length>5000||sha(proof.text)!==bound.claims.inputSha256))throw new RegistryError(403,'VOICE_REPLY_INTEGRITY');
    consumed=true;return proof;
   }
   return await bufferedVoiceOperation(request,authorize,async(proof,signal)=>{
    let response:Response,outputSha:string;
    if(operation==='transcribe'){
     const data=await deps.transcribe(audio!,signal).catch(error=>{throw new RegistryError(error instanceof VoiceTranscriptionError?error.status:502,'VOICE_TRANSCRIPTION_FAILED');});outputSha=sha(data.text);response=Response.json({success:true,...data});
    }else{
     const bytes=await deps.synthesize(proof.text!,signal);if(!bytes.byteLength||bytes.byteLength>8_000_000)throw new RegistryError(502,'VOICE_AUDIO_INVALID');outputSha=sha(bytes);response=new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}});
    }
    const ack=await deps.call('/api/core/voice/authorize',{action:'finish',...bound,status:'completed',output_sha256:outputSha}) as {acknowledged?:boolean};
    if(ack?.acknowledged!==true)throw new RegistryError(503,'VOICE_RESULT_UNCONFIRMED');finished=true;return response;
   });
  }catch(error){return failure(error instanceof VoiceTranscriptionError?new RegistryError(error.status,'VOICE_TRANSCRIPTION_FAILED'):error);}
  finally{
   if(attemptedConsume&&!finished&&delegation)try{await deps.call('/api/core/voice/authorize',{action:'finish',...delegation,status:request.signal.aborted?'aborted':'failed'});}catch{/* Unconfirmed cleanup never authorizes a retry or emits audio. */}
  }
 }
 return {
  readiness:async(request:Request)=>{try{const product=authorizedProduct(request);await emptyBody(request);return Response.json({success:true,workspace_id:product.workspaceId,provider_checked:false},{headers:{'Cache-Control':'no-store'}});}catch(error){return failure(error);}},
  transcribe:(request:Request)=>operate(request,'transcribe'),speak:(request:Request)=>operate(request,'speak')
 };
}
