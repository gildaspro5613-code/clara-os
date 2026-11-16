/** Presentation of Google events only. No persistence, authorization or provider engine. */
import {BUSINESS_TIME_ZONE,businessDayKey,businessDayWindow} from './calendar-window';
export type CalendarView='day'|'week'|'month';
export type GoogleCalendarEvent={id?:string;summary?:string;description?:string;location?:string;start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string}};
const civil=(day:string)=>new Date(day+'T12:00:00Z');
export function addCivilDays(day:string,amount:number){const value=civil(day);value.setUTCDate(value.getUTCDate()+amount);return value.toISOString().slice(0,10);}
export function calendarDays(start:string,end:string){const out:string[]=[];for(let day=start;day<end&&out.length<42;day=addCivilDays(day,1))out.push(day);return out;}
export function calendarRange(day:string,view:CalendarView){
 let start=day,end=addCivilDays(day,1);
 if(view==='week'){start=addCivilDays(day,-((civil(day).getUTCDay()+6)%7));end=addCivilDays(start,7);}
 if(view==='month'){
  const first=day.slice(0,7)+'-01',next=civil(first);next.setUTCMonth(next.getUTCMonth()+1);
  const nextDay=next.toISOString().slice(0,10);
  start=addCivilDays(first,-((civil(first).getUTCDay()+6)%7));
  end=addCivilDays(nextDay,(7-((civil(nextDay).getUTCDay()+6)%7))%7);
 }
 const from=businessDayWindow(civil(start)).start,to=businessDayWindow(civil(end)).start;
 return {start,end,days:calendarDays(start,end),url:'/api/calendar?'+new URLSearchParams({timeMin:from.toISOString(),timeMax:to.toISOString()})};
}
export function navigateCalendar(day:string,view:CalendarView,direction:number){
 if(view!=='month')return addCivilDays(day,direction*(view==='week'?7:1));
 const value=civil(day.slice(0,7)+'-01');value.setUTCMonth(value.getUTCMonth()+direction);return value.toISOString().slice(0,10);
}
export function eventInterval(event:GoogleCalendarEvent){
 const allDay=!!event.start?.date;
 if(allDay&&(!/^\d{4}-\d{2}-\d{2}$/.test(event.start?.date??'')||!/^\d{4}-\d{2}-\d{2}$/.test(event.end?.date??'')))return null;
 const start=allDay?businessDayWindow(civil(event.start!.date!)).start.getTime():Date.parse(event.start?.dateTime??'');
 const end=allDay&&event.end?.date?businessDayWindow(civil(event.end.date)).start.getTime():Date.parse(event.end?.dateTime??'');
 return Number.isFinite(start)&&Number.isFinite(end)&&end>start?{start,end,allDay}:null;
}
const minute=(instant:number)=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:BUSINESS_TIME_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);return Number(parts.find(p=>p.type==='hour')?.value)*60+Number(parts.find(p=>p.type==='minute')?.value);};
export function eventsOnDay(events:GoogleCalendarEvent[],day:string){
 const window=businessDayWindow(civil(day));return events.filter(event=>{const interval=eventInterval(event);return interval&&interval.start<window.end.getTime()&&interval.end>window.start.getTime();});
}
export function isCalendarBanner(event:GoogleCalendarEvent){const interval=eventInterval(event);return !!interval&&(interval.allDay||interval.end-interval.start>=86400000);}
export function timeSegments(events:GoogleCalendarEvent[],day:string){
 const {start,end}=businessDayWindow(civil(day));
 const segments=eventsOnDay(events,day).flatMap(event=>{const interval=eventInterval(event)!;if(isCalendarBanner(event))return [];
  const top=interval.start<=start.getTime()?0:minute(interval.start),bottom=interval.end>=end.getTime()?1440:minute(interval.end);
  // Wall-clock grid: repeated DST hours may overlap; exact instants/zone remain in details.
  return [{event,top,bottom:Math.min(1440,Math.max(top+20,bottom)),lane:0,lanes:1}];
 }).sort((a,b)=>a.top-b.top||b.bottom-a.bottom);
 let group:typeof segments=[];let groupEnd=-1;const finish=()=>{const lanes=Math.max(1,...group.map(s=>s.lane+1));for(const item of group)item.lanes=lanes;group=[];};
 for(const segment of segments){if(segment.top>=groupEnd){finish();groupEnd=-1;}const occupied=new Set(group.filter(s=>s.bottom>segment.top).map(s=>s.lane));while(occupied.has(segment.lane))segment.lane++;group.push(segment);groupEnd=Math.max(groupEnd,segment.bottom);}finish();return segments;
}
export function eventKey(event:GoogleCalendarEvent){return event.id??JSON.stringify([event.summary,event.start,event.end,event.location]);}
export function eventTime(event:GoogleCalendarEvent,locale:string,allDay:string){
 if(event.start?.date)return allDay;
 const format=(value?:string)=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'';
 return [format(event.start?.dateTime),format(event.end?.dateTime)].filter(Boolean).join(' – ');
}
export {businessDayKey};
