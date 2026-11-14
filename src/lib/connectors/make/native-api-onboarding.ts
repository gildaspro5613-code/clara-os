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
):boolean{
 const d=record(details),scenario=record(d?.scenario??d);
 const interfaceEnvelope=record(scenarioInterface);
 const iface=record(interfaceEnvelope?.interface??interfaceEnvelope);
 const inputs=iface?.input;
 const blueprintEnvelope=record(blueprintResponse);
 let raw=blueprintEnvelope?.blueprint??blueprintEnvelope?.response??blueprintResponse;
 if(typeof raw==='string'){
  if(raw.length>MAX_BLUEPRINT_BYTES)return false;
  try{raw=JSON.parse(raw);}catch{return false;}
 }
 const outer=record(raw),blueprint=record(outer?.blueprint??outer);
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
   x.flow!==undefined||x.mapper===undefined;}))return false;
 const defined=new Map<string,{required:boolean;type:string}>();
 for(const entry of inputs){
  const v=record(entry);
  if(!v||typeof v.name!=='string'||typeof v.type!=='string'||defined.has(v.name))
   return false;
  defined.set(v.name,{type:v.type,required:v.required===true});
 }
 if(defined.size>3||![...defined.keys()].every(n=>['query','workspaceId','missionId'].includes(n)))
  return false;
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

/** Three READ-only requests. No supplier run, webhook, activate or update.
 * This validates the blueprint and the exact required query/workspace inputs.
 * No result, error or status contains the token.
 */
export async function verifyMakeReadConnection(
 input:MakeReadConnectionInput,fetcher:typeof fetch=fetch,
):Promise<boolean>{
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
   if(!response.ok)throw Error('MAKE_PROVIDER_UNAVAILABLE');
   const text=await response.text();
   if(!text||text.length>MAX_BLUEPRINT_BYTES)throw Error('MAKE_PROVIDER_RESPONSE_INVALID');
   return JSON.parse(text) as unknown;
  };
  const details=await get('');
  const contract=await get('/interface');
  const blueprint=await get('/blueprint?draft=false');
  return verifyMakeDriveScenarioContract(details,contract,blueprint,input.scenarioId);
 }catch{return false;}
 finally{clearTimeout(timeout);}
}
