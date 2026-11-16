/** Existing daily Calendar read window, aligned with the business interface. */
export const BUSINESS_TIME_ZONE='Europe/Paris';
const parts=(date:Date)=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
export function businessDayKey(date:Date=new Date()){const p=parts(date);return `${p.year}-${p.month}-${p.day}`;}
function midnight(year:number,month:number,day:number){
 const target=Date.UTC(year,month-1,day);let value=target;
 for(let i=0;i<3;i++){const p=parts(new Date(value)),offset=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-target;if(offset===0)break;value-=offset;}
 return new Date(value);
}
export function businessDayWindow(date:Date=new Date()){
 const p=parts(date),year=+p.year,month=+p.month,day=+p.day;
 return {start:midnight(year,month,day),end:midnight(year,month,day+1)};
}
export function formatBusinessDate(day:string,locale:string){
 const text=new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(day+'T12:00:00Z'));
 return text[0].toLocaleUpperCase(locale)+text.slice(1);
}
export function todayCalendarUrl(date:Date=new Date()){const {start,end}=businessDayWindow(date);return '/api/calendar?'+new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString()});}

/** Reuse the existing bounded Calendar read API; civil-day arithmetic keeps Paris DST. */
export type AgendaPeriod='today'|'week'|'upcoming';
export function agendaCalendarUrl(period:AgendaPeriod,date:Date=new Date()){
 const day=businessDayKey(date),civil=new Date(day+'T12:00:00Z');
 const first=new Date(civil);
 if(period==='week')first.setUTCDate(first.getUTCDate()-((first.getUTCDay()+6)%7));
 const last=new Date(first);last.setUTCDate(last.getUTCDate()+(period==='today'?1:period==='week'?7:30));
 return '/api/calendar?'+new URLSearchParams({timeMin:businessDayWindow(first).start.toISOString(),timeMax:businessDayWindow(last).start.toISOString()});
}
