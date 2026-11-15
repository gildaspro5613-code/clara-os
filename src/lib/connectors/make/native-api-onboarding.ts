import type {MakeApiCredentials,MakeWebhookCredentials} from './types';

const ZONE=/^(?:eu|us|ca|au)[1-9][0-9]?$/;
const MAX_BLUEPRINT_BYTES=140_000;
const MODULES=[
 'scenario-service:StartSubscenario',
 'google-drive:searchForFilesFolders',
 'scenario-service:ReturnData',
] as const;

export type MakeReadConnectionInput=Readonly<{
 token:string;zone:string;scenarioId:number;
}>;

export function validateMakeReadConnectionInput(raw:unknown):MakeReadConnectionInput{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype)
  throw new Error('MAKE_INVALID_CONNECTION');
 const v=raw as Record<string,unknown>;
 if(Object.keys(v).sort().join('|')!=='scenarioId|token|zone' ||
    typeof v.token!=='string'||v.token.length<20||v.token.length>4096||
    v.token!==v.token.trim()||/[\x00-\x20\x7f]/.test(v.token)||
    typeof v.zone!=='string'||!ZONE.test(v.zone)||
    typeof v.scenarioId!=='number'||!Number.isSafeInteger(v.scenarioId)||
    v.scenarioId<1||v.scenarioId>9_999_999_999)
  throw new Error('MAKE_INVALID_CONNECTION');
 return {token:v.token,zone:v.zone,scenarioId:v.scenarioId};
}

function record(value:unknown):Record<string,unknown>|null{
 return !!value&&typeof value==='object'&&!Array.isArray(value)?
  value as Record<string,unknown>:null;
}

export function verifyMakeDriveScenarioContract(
 details:unknown,scenarioInterface:unknown,blueprintResponse:unknown,scenarioId:number,
 requireFolderSupport=false,
):boolean{
 const d=record(details),scenario=record(d?.scenario??d);
 const interfaceEnvelope=record(scenarioInterface);
 const iface=record(interfaceEnvelope?.interface??interfaceEnvelope);
 const inputs=iface?.input;
 const blueprintEnvelope=record(blueprintResponse);
 const inner=record(blueprintEnvelope?.response);
 let raw=blueprintEnvelope?.blueprint??inner?.blueprint??
  blueprintEnvelope?.response??blueprintResponse;
 if(typeof raw==='string'){
  if(raw.length>MAX_BLUEPRINT_BYTES)return false;
  try{raw=JSON.parse(raw);}catch{return false;}
 }
 let outer=record(raw);
 if(typeof outer?.blueprint==='string'){
  if(outer.blueprint.length>MAX_BLUEPRINT_BYTES)return false;
  try{outer=record(JSON.parse(outer.blueprint));}catch{return false;}
 }
 const blueprint=record(outer?.blueprint??outer);
 const flow=blueprint?.flow;
 if(!scenario||!iface||!Array.isArray(inputs)||!blueprint||!Array.isArray(flow)||
   flow.length!==MODULES.length)return false;
 if(Number(scenario.id)!==scenarioId)return false;
 if(scenario.isActive!==true && scenario.status!=='active')return false;
 const trigger=record(scenario.scheduling);
 if(trigger?.type && trigger.type!=='on-demand')return false;
 const names=flow.map(part=>record(part)?.module);
 if(!names.every((x,i)=>x===MODULES[i]))return false;
 // Refuse nested routing/branches that could execute something other than READ.
 if(flow.some(part=>{const x=record(part);return !x||x.routes!==undefined||
   x.flow!==undefined;}))return false;
 const defined=new Map<string,{required:boolean;type:string}>();
 for(const entry of inputs){
  const v=record(entry);
  if(!v||typeof v.name!=='string'||typeof v.type!=='string'||defined.has(v.name))
   return false;
  defined.set(v.name,{type:v.type,required:v.required===true});
 }
 const folderAware=defined.has('folderId');
 if(defined.size>4||![...defined.keys()].every(n=>['query','workspaceId','missionId','folderId'].includes(n)))return false;
 if(requireFolderSupport&&!folderAware)return false;
 if(folderAware){
  if(defined.get('folderId')?.required!==false||
     !['text','string'].includes(defined.get('folderId')?.type??''))return false;
  const search=record(record(flow[1])?.mapper);
  const out=record(record(flow[2])?.mapper);
  // V2 contract: exactly the provider's plain-name read + optional folder.
  // Refuse custom raw Drive queries, arbitrary mappings and huge result sets.
  if(search?.select!=='map'||search.retrieve!=='file_folder'||
     search.searchType!=='title'||search.operator!=='contains'||
     search.query!=='{{1.query}}'||search.folderId!=='{{1.folderId}}'||
     !Number.isSafeInteger(Number(search.limit))||Number(search.limit)<1||
     Number(search.limit)>10||
     out?.fileId!=='{{2.id}}'||out.fileName!=='{{2.name}}'||
     out.mimeType!=='{{2.mimeType}}')return false;
 }
 return defined.get('workspaceId')?.required===true&&
  defined.get('query')?.required===true&&
  ['text','string'].includes(defined.get('workspaceId')?.type??'')&&
  ['text','string'].includes(defined.get('query')?.type??'');
}

export function makeNativeDriveCredentials(input:MakeReadConnectionInput):MakeWebhookCredentials{
 return {
  scenarios:{'find-drive-document':{transport:'api',scenarioId:input.scenarioId}},
  api:{token:input.token,zone:input.zone},
 };
}

export type MakeReadVerificationFailure=
 'MAKE_TOKEN_REJECTED'|'MAKE_TOKEN_PERMISSION_DENIED'|
 'MAKE_SCENARIO_UNAVAILABLE'|'MAKE_PROVIDER_RATE_LIMITED'|
 'MAKE_PROVIDER_UNREACHABLE'|'MAKE_PROVIDER_RESPONSE_INVALID'|
 'MAKE_SCENARIO_CONTRACT_MISMATCH';
export type MakeReadVerificationResult={ok:true}|{ok:false;code:MakeReadVerificationFailure};
class MakeReadVerificationError extends Error{
 constructor(readonly code:MakeReadVerificationFailure){super(code);}
}
/** Three supplier GETs only. Public diagnostic codes are fixed and safe:
 * never expose the token or an upstream response body/exception.
 */
export async function verifyMakeReadConnectionDetailed(
 input:MakeReadConnectionInput,fetcher:typeof fetch=fetch,
 requireFolderSupport=false,
):Promise<MakeReadVerificationResult>{
 const root=`https://${input.zone}.make.com/api/v2/scenarios/${input.scenarioId}`;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12_000);
 try{
  const get=async(path:string)=>{
   const response=await fetcher(root+path,{
    method:'GET',
    headers:{Authorization:`Token ${input.token}`,Accept:'application/json'},
    cache:'no-store',redirect:'error',signal:controller.signal,
   });
   if(!response.ok){
    if(response.status===401)throw new MakeReadVerificationError('MAKE_TOKEN_REJECTED');
    if(response.status===403)throw new MakeReadVerificationError('MAKE_TOKEN_PERMISSION_DENIED');
    if(response.status===404)throw new MakeReadVerificationError('MAKE_SCENARIO_UNAVAILABLE');
    if(response.status===429)throw new MakeReadVerificationError('MAKE_PROVIDER_RATE_LIMITED');
    throw new MakeReadVerificationError('MAKE_PROVIDER_UNREACHABLE');
   }
   const text=await response.text();
   if(!text||text.length>MAX_BLUEPRINT_BYTES)
    throw new MakeReadVerificationError('MAKE_PROVIDER_RESPONSE_INVALID');
   try{return JSON.parse(text) as unknown;}
   catch{throw new MakeReadVerificationError('MAKE_PROVIDER_RESPONSE_INVALID');}
  };
  const details=await get('');
  const contract=await get('/interface');
  const blueprint=await get('/blueprint?draft=false');
  return verifyMakeDriveScenarioContract(details,contract,blueprint,input.scenarioId,requireFolderSupport)?
   {ok:true}:{ok:false,code:'MAKE_SCENARIO_CONTRACT_MISMATCH'};
 }catch(error){
  return {ok:false,code:error instanceof MakeReadVerificationError?
   error.code:'MAKE_PROVIDER_UNREACHABLE'};
 }finally{clearTimeout(timeout);}
}
/** Keep the established boolean interface for existing callers. */
export async function verifyMakeReadConnection(
 input:MakeReadConnectionInput,fetcher:typeof fetch=fetch,
 requireFolderSupport=false,
):Promise<boolean>{
 return (await verifyMakeReadConnectionDetailed(input,fetcher,requireFolderSupport)).ok;
}
