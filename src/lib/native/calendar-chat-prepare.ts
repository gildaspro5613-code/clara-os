import type {ClaraSession} from '@/lib/core/session';
import {nativeContext} from '@/lib/native/scoped-context';
import {nativeGoogleCommand} from '@/lib/native/google-authority';
import {NativeGoogleWork,googleWorkCommand,GOOGLE_SCOPES} from '@/lib/native/google-work';
import {matchesAuthorizedCalendarName} from '@/lib/brain/calendar-read-intent';
import {parseNativeCalendarChatDraft} from './calendar-chat-draft';

export type NativeCalendarChatProposal={
  connectionId:string;operationId:string;status:string;reviewHash:string;
  calendarName:string;proposal:{kind:string;name:string;resourceId:string;start:string;end:string;description:string;missionId:string};
};
export type NativeCalendarChatPreparation=
 | {kind:'not-a-request'}
 | {kind:'unavailable';code:string}
 | {kind:'prepared';review:NativeCalendarChatProposal};

/** Bound, scoped native Google Work only. The composer cannot fabricate a proposal. */
export async function prepareNativeCalendarChat(message:string,operationId:string,session:ClaraSession):Promise<NativeCalendarChatPreparation>{
 const draft=parseNativeCalendarChatDraft(message);
 if(!draft)return {kind:'not-a-request'};
 const ctx=nativeContext();
 if(!ctx||!ctx.writable||!ctx.session.mission||session.mission?.id!==ctx.session.mission.id)return {kind:'unavailable',code:'GOOGLE_MISSION_REQUIRED'};
 // Calendar READ already passed authority, scoped binding, provider check and
 // optional pagination. Do not infer a grant from the calendar's display name.
 const source=session.sources.find(s=>s.source==='google-calendar');
 const data=source?.data as {calendarId?:unknown;calendarName?:unknown;partial?:unknown}|undefined;
 if(!source?.available||typeof data?.calendarId!=='string'||typeof data.calendarName!=='string'
   ||data.partial!==false||!matchesAuthorizedCalendarName(data.calendarName,draft.calendarName))
   return {kind:'unavailable',code:'GOOGLE_CALENDAR_AUTHORIZED_READ_REQUIRED'};
 const connections=await nativeGoogleCommand('list');
 const active=((connections.connections??[]) as Array<{id?:string;status?:string;scopes?:string[]}>)
   .filter(c=>typeof c.id==='string'&&c.status==='ACTIVE'&&GOOGLE_SCOPES.agenda.every(s=>c.scopes?.includes(s)));
 if(active.length===0||active.length>8)return {kind:'unavailable',code:'GOOGLE_CALENDAR_CONNECTION_REQUIRED'};
 const matched:Array<{connectionId:string;bindingId:string}>=[];
 for(const connection of active){
   const connectionId=connection.id!;
   const resources=await googleWorkCommand('resources',{connectionId});
   const bindings=((resources.resources??[]) as Array<{bindingId?:string;kind?:string;metadata?:{kind?:string;id?:string}}> )
     .filter(r=>r.kind==='calendar'&&r.metadata?.kind==='calendar'&&r.metadata.id===data.calendarId&&typeof r.bindingId==='string');
   for(const binding of bindings){
     await googleWorkCommand('resource',{connectionId,bindingId:binding.bindingId});
     matched.push({connectionId,bindingId:binding.bindingId!});
   }
 }
 if(matched.length!==1)return {kind:'unavailable',code:'GOOGLE_CALENDAR_BINDING_AMBIGUOUS'};
 const connectionId=matched[0].connectionId;
 const work=await new NativeGoogleWork(connectionId).initialize();
 const liveCalendar=await work.calendar(data.calendarId);
 if(!matchesAuthorizedCalendarName(liveCalendar.summary??'',draft.calendarName))return {kind:'unavailable',code:'GOOGLE_CALENDAR_NAME_CHANGED'};
 // This is a previously bound resource; no implicit new grant or global
 // primary-calendar fallback. Existing native write preflight remains intact.
 await work.select('calendar',data.calendarId);
 const result=await work.prepare({operationId,kind:'calendar.create',resourceId:data.calendarId,name:draft.name,
   start:draft.start,end:draft.end,description:draft.description});
 if(result.status!=='queued'||typeof result.reviewHash!=='string')return {kind:'unavailable',code:'GOOGLE_CALENDAR_PREPARE_UNCONFIRMED'};
 return {kind:'prepared',review:{connectionId,operationId:result.operationId,status:result.status,
   reviewHash:result.reviewHash,calendarName:data.calendarName,
   proposal:{kind:'calendar.create',name:draft.name,resourceId:data.calendarId,start:draft.start,end:draft.end,description:draft.description,missionId:ctx.session.mission.id}}};
}
