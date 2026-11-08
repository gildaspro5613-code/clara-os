import {parseNativeCalendarReadIntent} from '@/lib/brain/calendar-read-intent';

/**
 * Strict, bounded entry into the existing Google work preparation contract.
 * This is a TEXT-to-DRAFT adapter, never a consent or execution adapter.
 * Unstructured, ambiguous or invitation-bearing requests remain conversational.
 */
export type NativeCalendarChatDraft={
  calendarName:string;name:string;start:string;end:string;description:string;
};
const line=(message:string,key:string)=>{
  const match=message.match(new RegExp('^\\s*(?:'+key+')\\s*:\\s*(.*?)\\s*$','im'));
  return match?.[1]?.trim()??null;
};
const valid=(value:string,max:number)=>value.length>0&&value.length<=max&&!/[\x00-\x1f\x7f]/.test(value);

function parisDateTime(date:string,hour:number,minute:number):string|null{
  if(hour<0||hour>23||minute<0||minute>59)return null;
  // Noon is on the same side of the DST switch as 10:00; explicitly reject
  // nonexistent and duplicated local times rather than silently shift them.
  const zone=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',timeZoneName:'shortOffset'})
    .formatToParts(new Date(date+'T12:00:00Z')).find(part=>part.type==='timeZoneName')?.value??'';
  const match=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone);
  if(!match)return null;
  const offset=match[1]+match[2].padStart(2,'0')+':'+(match[3]??'00');
  const local=date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00'+offset;
  const time=Date.parse(local);
  if(!Number.isFinite(time))return null;
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const key=(time:number)=>{
    const parts=formatter.formatToParts(new Date(time));
    const p=(type:string)=>parts.find(x=>x.type===type)?.value??'';
    return [p('year'),p('month'),p('day')].join('-')+'T'+p('hour')+':'+p('minute');
  };
  const expected=date+'T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
  if(key(time)!==expected||key(time-3600000)===expected||key(time+3600000)===expected)return null;
  return local;
}

export function parseNativeCalendarChatDraft(message:string):NativeCalendarChatDraft|null{
  if(!/\b(?:pr[ée]pare|pr[ée]parer|pr[ée]paration)\b/iu.test(message))return null;
  if(/\bne\s+(?:pr[ée]pare|pr[ée]parer)\s+pas\b/iu.test(message))return null;
  const name=line(message,'Titre|Title'),calendarName=line(message,'Calendrier|Calendar');
  const date=line(message,'Date'),hours=line(message,'Heure|Horaire|Time');
  const invite=line(message,'Invit[ée]s|Guests');
  const description=line(message,'Description')??'';
  if(!name||!calendarName||!date||!hours||!invite||!/^aucun(?:e|s)?$|^none$/iu.test(invite)
    ||!valid(name,200)||!valid(calendarName,160)||description.length>4000)return null;
  const range=parseNativeCalendarReadIntent(date);
  if(range.kind!=='range'||range.from!==range.through)return null;
  const parts=hours.match(/^(\d{1,2})\s*(?:h|:)\s*(\d{0,2})\s*(?:à|au|–|-|to)\s*(\d{1,2})\s*(?:h|:)\s*(\d{0,2})(?:\b|$)/iu);
  if(!parts)return null;
  const start=parisDateTime(range.from,Number(parts[1]),Number(parts[2]||0));
  const end=parisDateTime(range.from,Number(parts[3]),Number(parts[4]||0));
  if(!start||!end||Date.parse(end)<=Date.parse(start))return null;
  return {calendarName,name,start,end,description};
}
