import type {MakeApiCredentials,MakeCalendarReadBinding} from './types';
import {validateMakeReadConnectionInput} from './native-api-onboarding';
import {calendarKeys,calendarRecord,calendarReadDenied,type MakeCalendarRead} from './native-calendar-read-contract';

const MAX_BYTES=140_000;
const same=(a:unknown,b:unknown):boolean=>{
 const left=calendarRecord(a),right=calendarRecord(b);
 if(left&&right)return Object.keys(left).length===Object.keys(right).length&&Object.keys(right).every(k=>same(left[k],right[k]));
 if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>same(v,b[i]));
 return a===b;
};
/** Exact audited READ blueprint, including resource, connection and output maps.
 * Reject additional modules, filters, handlers or mappings that alter semantics.
 */
export function verifyMakeCalendarScenarioContract(
 cap:MakeCalendarRead,binding:MakeCalendarReadBinding,details:unknown,scenarioInterface:unknown,blueprintResponse:unknown,
):boolean{
 try{
  const envelope=calendarRecord(details),scenario=calendarRecord(envelope?.scenario??details);
  const ifaceEnvelope=calendarRecord(scenarioInterface),iface=calendarRecord(ifaceEnvelope?.interface??scenarioInterface);
  const bpEnvelope=calendarRecord(blueprintResponse),response=calendarRecord(bpEnvelope?.response);
  let raw=bpEnvelope?.blueprint??response?.blueprint??blueprintResponse;
  if(typeof raw==='string'){if(raw.length>MAX_BYTES)return false;raw=JSON.parse(raw);}
  const outer=calendarRecord(raw);
  if(outer?.blueprint!==undefined){raw=outer.blueprint;if(typeof raw==='string'){if(raw.length>MAX_BYTES)return false;raw=JSON.parse(raw);}}
  const bp=calendarRecord(raw),flow=bp?.flow;
  if(!scenario||Number(scenario.id)!==cap.scenarioId||scenario.isActive!==true&&scenario.status!=='active'||
   calendarRecord(scenario.scheduling)?.type!=='on-demand'||!iface||!Array.isArray(flow)||flow.length!==3)return false;
  const search=cap.scenarioId===7295113;
  const expectedInputs:Record<string,{type:string;required:boolean}>={workspaceId:{type:'text',required:true},start:{type:'date',required:true},end:{type:'date',required:true},missionId:{type:'text',required:false},...(search?{query:{type:'text',required:false}}:{})};
  const expectedOutputs:Record<string,string>={status:'text',provider:'text',...(search?{eventId:'text',eventTitle:'text',start:'text',end:'text',location:'text',htmlLink:'text'}:{busyRanges:'any',start:'text',end:'text'})};
  if(!Array.isArray(iface.input)||!Array.isArray(iface.output)||iface.input.length!==Object.keys(expectedInputs).length||iface.output.length!==Object.keys(expectedOutputs).length)return false;
  const inputs=new Set<string>(),outputs=new Set<string>();
  for(const item of iface.input){const v=calendarRecord(item);if(!v||typeof v.name!=='string'||inputs.has(v.name))return false;
   const expected=expectedInputs[v.name];if(!expected||v.type!==expected.type||Boolean(v.required)!==expected.required)return false;inputs.add(v.name);}
  for(const item of iface.output){const v=calendarRecord(item);if(!v||typeof v.name!=='string'||outputs.has(v.name)||v.type!==expectedOutputs[v.name])return false;outputs.add(v.name);}
  const names=['scenario-service:StartSubscenario',cap.module,'scenario-service:ReturnData'];
  for(let i=0;i<3;i++){
   const part=calendarRecord(flow[i]);
   if(!part||part.id!==i+1||part.module!==names[i]||part.version!==(i===1?5:2)||
    !calendarKeys(part,['id','module','version','metadata','parameters','mapper']))return false;
  }
  const start=calendarRecord(flow[0])!,read=calendarRecord(flow[1])!,out=calendarRecord(flow[2])!;
  if(!same(start.parameters??{},{})||!same(start.mapper??{},{})||!same(out.parameters??{},{}))return false;
  if(!same(read.parameters,{__IMTCONN__:binding.makeConnectionId}))return false;
  const mapper=search?{q:'{{1.query}}',limit:10,orderBy:'startTime',timeMax:'{{1.end}}',timeMin:'{{1.start}}',calendar:binding.calendarId,eventTypes:'default',singleEvents:true}:
   {item:[{id:binding.calendarId}],timeMax:'{{1.end}}',timeMin:'{{1.start}}'};
  const output=search?{end:'{{2.end}}',start:'{{2.start}}',status:'completed',eventId:'{{2.id}}',htmlLink:'{{2.htmlLink}}',location:'{{2.location}}',provider:'google-calendar',eventTitle:'{{2.summary}}'}:
   {end:'{{2.timeMax}}',start:'{{2.timeMin}}',status:'completed',provider:'google-calendar',busyRanges:'{{2.result}}'};
  return same(read.mapper,mapper)&&same(out.mapper,output);
 }catch{return false;}
}

/** Read approved LIVE version, never draft. Three bounded GETs, zero retries. */
export async function verifyMakeCalendarReadConnection(
 cap:MakeCalendarRead,binding:MakeCalendarReadBinding,api:MakeApiCredentials,fetcher:typeof fetch=fetch,
):Promise<void>{
 try{validateMakeReadConnectionInput({...api,scenarioId:cap.scenarioId});}
 catch{calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12_000);
 try{
  const root=`https://${api.zone}.make.com/api/v2/scenarios/${cap.scenarioId}`;
  const get=async(path:string)=>{
   const response=await fetcher(root+path,{method:'GET',headers:{Authorization:`Token ${api.token}`,Accept:'application/json'},cache:'no-store',redirect:'error',signal:controller.signal});
   if(!response.ok)calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_PROVIDER_UNAVAILABLE');
   const text=await response.text();
   if(!text||text.length>MAX_BYTES)calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_SCENARIO_CHANGED');
   try{return JSON.parse(text) as unknown;}catch{calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_SCENARIO_CHANGED');}
  };
  const details=await get(''),iface=await get('/interface'),blueprint=await get('/blueprint?draft=false');
  if(!verifyMakeCalendarScenarioContract(cap,binding,details,iface,blueprint))calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_SCENARIO_CHANGED');
 }catch(error){
  const {RegistryError}=await import('@/lib/canonical/registry');
  if(error instanceof RegistryError)throw error;
  calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_PROVIDER_UNAVAILABLE');
 }finally{clearTimeout(timeout);}
}
