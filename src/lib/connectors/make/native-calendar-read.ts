import {matchesAuthorizedCalendarReadReference} from '@/lib/brain/calendar-read-intent';
import {RegistryError} from '@/lib/canonical/registry';
import type {NativeConnectorScope} from '@/lib/connectors/core/native-connector-read-gateway';
import type {NativeGoogleProof} from '@/lib/native/google-authority';
import type {MakeCalendarReadBinding,MakeScenarioInvocation,MakeWebhookCredentials} from './types';
import {calendarRecord,calendarReadDenied,makeCalendarRead,makeCalendarReadState,nativeMakeCalendarReadInput,nativeMakeCalendarReadResult,type MakeCalendarInput} from './native-calendar-read-contract';
import {verifyMakeCalendarReadConnection} from './native-calendar-scenario';

export type CalendarResourceProof={bindingId:string;googleRevision:number};
export interface MakeCalendarReadDependencies{
 authorize(binding:MakeCalendarReadBinding):Promise<CalendarResourceProof>;
 invoke(invocation:MakeScenarioInvocation):Promise<unknown>;
 fetcher?:typeof fetch;
}
export function validateMakeCalendarBinding(value:unknown):MakeCalendarReadBinding{
 const v=calendarRecord(value);
 if(!v||Object.keys(v).sort().join('|')!=='calendarId|calendarName|googleConnectionId|googleSubject|makeConnectionId'||
  typeof v.googleConnectionId!=='string'||!/^[a-zA-Z0-9._:-]{1,160}$/.test(v.googleConnectionId)||
  typeof v.googleSubject!=='string'||!v.googleSubject||v.googleSubject.length>400||/[\x00-\x20\x7f]/.test(v.googleSubject)||
  typeof v.calendarName!=='string'||!v.calendarName.trim()||v.calendarName.length>160||/[\x00-\x1f\x7f]/.test(v.calendarName)||
  typeof v.calendarId!=='string'||!v.calendarId||v.calendarId==='primary'||v.calendarId.length>400||/[\x00-\x20\x7f{}]/.test(v.calendarId)||
  !Number.isSafeInteger(v.makeConnectionId)||Number(v.makeConnectionId)<1)
  calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 return v as unknown as MakeCalendarReadBinding;
}

/** Existing Google authority and durable resource commands enforce caller,
 * workspace/client/project, revocation and subject. No Google provider call.
 */
export async function authorizeNativeMakeCalendar(binding:MakeCalendarReadBinding):Promise<CalendarResourceProof>{
 const {nativeContext}=await import('@/lib/native/scoped-context');
 const {googleAuthority}=await import('@/lib/native/google-authority');
 const {googleWorkCommand}=await import('@/lib/native/google-work');
 const ctx=nativeContext();
 if(!ctx)calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 return authorizeMakeCalendarResource(ctx.scope,ctx.userId,{...ctx.session,expectedCalendarName:makeCalendarReadState(ctx).expectedCalendarName},binding,{authority:googleAuthority,command:googleWorkCommand});
}

export async function authorizeMakeCalendarResource(
 scope:Pick<NativeConnectorScope,'workspaceId'>,userId:string,
 selected:{googleConnectionId?:string;googleCalendarId?:string;expectedCalendarName?:string|null},binding:MakeCalendarReadBinding,
 deps:{authority(id:string):Promise<NativeGoogleProof>;command(operation:string,payload:Record<string,unknown>):Promise<Record<string,unknown>>},
):Promise<CalendarResourceProof>{
 const denied=()=>calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 try{
  if(selected.expectedCalendarName&&!matchesAuthorizedCalendarReadReference(binding.calendarName,selected.expectedCalendarName))return denied();
  if(selected.googleConnectionId!==binding.googleConnectionId||selected.googleCalendarId!==binding.calendarId)return denied();
  const proof=await deps.authority(binding.googleConnectionId);
  if(proof.connectionId!==binding.googleConnectionId||proof.userId!==userId||proof.ownerUserId!==userId||
   proof.issuer!=='https://accounts.google.com'||proof.subject!==binding.googleSubject||
   !Number.isSafeInteger(proof.revision)||proof.revision<1||proof.connection.workspace_id!==scope.workspaceId||proof.connection.status!=='ACTIVE')return denied();
  const records=await deps.command('resources',{connectionId:binding.googleConnectionId});
  if(!Array.isArray(records.resources)||records.resources.length>100)return denied();
  const matches=records.resources.map(calendarRecord).filter(r=>r?.kind==='calendar'&&calendarRecord(r.metadata)?.id===binding.calendarId);
  if(matches.length!==1||typeof matches[0]?.bindingId!=='string')return denied();
  const bindingId=matches[0].bindingId;
  const record=await deps.command('resource',{connectionId:binding.googleConnectionId,bindingId});
  const metadata=calendarRecord(record.metadata);
  if(record.kind!=='calendar'||record.bindingId!==bindingId||metadata?.id!==binding.calendarId||
   metadata.connectionId!==binding.googleConnectionId||metadata.issuer!==proof.issuer||metadata.subject!==proof.subject)return denied();
  return {bindingId,googleRevision:proof.revision};
 }catch{return denied();}
}

/** Calendar-only addition to the shared native executor. The adapter, credentials,
 * native grant checks and gateway audit remain the existing implementations.
 */
export async function executeMakeCalendarRead(
 capabilityId:string,workspaceId:string,input:MakeCalendarInput,credentials:MakeWebhookCredentials,deps:MakeCalendarReadDependencies,
){
 const cap=makeCalendarRead(capabilityId);
 if(!cap)calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 const validated=nativeMakeCalendarReadInput(capabilityId,input);
 if(!/^[a-zA-Z0-9._:-]{1,160}$/.test(workspaceId))calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 const binding=validateMakeCalendarBinding(credentials.calendarReadBinding);
 const config=credentials.scenarios[cap.scenarioKey],api=credentials.api;
 if(!api||config?.transport!=='api'||config.scenarioId!==cap.scenarioId)calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 const first=await deps.authorize(binding);
 await verifyMakeCalendarReadConnection(cap,binding,api,deps.fetcher);
 const revalidate=async()=>{
  const next=await deps.authorize(binding);
  if(next.bindingId!==first.bindingId||next.googleRevision!==first.googleRevision)calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_BINDING_DENIED');
 };
 await revalidate();
 let receipt:unknown;
 try{
  receipt=await deps.invoke({scenarioKey:cap.scenarioKey,payload:{workspaceId,start:validated.start,end:validated.end,...(validated.query?{query:validated.query}:{})}});
 }catch{throw new RegistryError(503,'CONNECTOR_BUILDER_MAKE_CALENDAR_PROVIDER_UNAVAILABLE');}
 await revalidate();
 const value=calendarRecord(receipt);
 if(!value||value.ok!==true||value.executionStatus!=='completed'||value.scenarioKey!==cap.scenarioKey||typeof value.status!=='number'||value.status<200||value.status>=300)
  calendarReadDenied('CONNECTOR_BUILDER_MAKE_CALENDAR_RESULT_INVALID');
 const data=nativeMakeCalendarReadResult(capabilityId,value.data,validated);
 return {data:{calendarId:binding.calendarId,calendarName:binding.calendarName,...data},revalidate};
}
