import type {MakeWebhookCredentials,MakeCalendarReadBinding} from '@/lib/connectors/make/types';
import {MAKE_CALENDAR_READS,type MakeCalendarRead} from '@/lib/connectors/make/native-calendar-read-contract';
export const calendarBinding:MakeCalendarReadBinding={googleConnectionId:'google-fixture',googleSubject:'fixture-subject',calendarId:'fixture-calendar@group.calendar.google.com',calendarName:'Fixture Calendar',makeConnectionId:123456};
export const calendarCredentials:MakeWebhookCredentials={api:{zone:'eu1',token:'fixture-only-token-not-a-secret'},calendarReadBinding:calendarBinding,scenarios:Object.fromEntries(MAKE_CALENDAR_READS.map(c=>[c.scenarioKey,{transport:'api',scenarioId:c.scenarioId}]))};
export const calendarInput={start:'2026-11-17T09:00:00+01:00',end:'2026-11-17T12:00:00+01:00',timeZone:'Europe/Paris'};
export function calendarContractFixture(cap:MakeCalendarRead){
 const search=cap.scenarioId===7295113;
 return {
  details:{scenario:{id:cap.scenarioId,isActive:true,scheduling:{type:'on-demand'}}},
  iface:{interface:{input:[{name:'workspaceId',type:'text',required:true},{name:'start',type:'date',required:true},{name:'end',type:'date',required:true},...(search?[{name:'query',type:'text',required:false}]:[]),{name:'missionId',type:'text',required:false}],output:Object.entries({status:'text',provider:'text',...(search?{eventId:'text',eventTitle:'text',start:'text',end:'text',location:'text',htmlLink:'text'}:{busyRanges:'any',start:'text',end:'text'})}).map(([name,type])=>({name,type}))}},
  blueprint:{blueprint:{flow:[
   {id:1,module:'scenario-service:StartSubscenario',version:2},
   {id:2,module:cap.module,version:5,parameters:{__IMTCONN__:calendarBinding.makeConnectionId},mapper:search?{q:'{{1.query}}',limit:10,orderBy:'startTime',timeMax:'{{1.end}}',timeMin:'{{1.start}}',calendar:calendarBinding.calendarId,eventTypes:'default',singleEvents:true}:{item:[{id:calendarBinding.calendarId}],timeMax:'{{1.end}}',timeMin:'{{1.start}}'}},
   {id:3,module:'scenario-service:ReturnData',version:2,mapper:search?{end:'{{2.end}}',start:'{{2.start}}',status:'completed',eventId:'{{2.id}}',htmlLink:'{{2.htmlLink}}',location:'{{2.location}}',provider:'google-calendar',eventTitle:'{{2.summary}}'}:{end:'{{2.timeMax}}',start:'{{2.timeMin}}',status:'completed',provider:'google-calendar',busyRanges:'{{2.result}}'}},
  ]}},
 };
}
export function calendarResponse(cap:MakeCalendarRead){
 return cap.scenarioId===7295055?{status:'completed',provider:'google-calendar',start:calendarInput.start,end:calendarInput.end,busyRanges:[{start:'2026-11-17T09:30:00+01:00',end:'2026-11-17T10:00:00+01:00'}]}:
  {status:'completed',provider:'google-calendar',eventId:'fixture-event',eventTitle:'RTSE Angers',start:'2026-11-17T09:30:00+01:00',end:'2026-11-17T10:00:00+01:00',location:'Angers',htmlLink:'https://www.google.com/calendar/event?eid=fixture'};
}
export function calendarFixtureFetch(cap:MakeCalendarRead){
 const fixture=calendarContractFixture(cap),responses=[fixture.details,fixture.iface,fixture.blueprint],urls:string[]=[];
 const fetcher:typeof fetch=async(url,init)=>{
  if(init?.method!=='GET')throw Error('No provider run allowed in fixture verifier');
  urls.push(String(url));
  if(urls.length>3)throw Error('Unexpected retry');
  return new Response(JSON.stringify(responses[urls.length-1]));
 };
 return {fetcher,urls};
}
