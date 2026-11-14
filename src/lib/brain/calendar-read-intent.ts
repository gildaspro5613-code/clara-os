/** Interpret an explicit dated READ request without selecting a calendar or making a provider call. */
export type NativeCalendarReadIntent =
 | {kind:'default';expectedName:string|null}
 | {kind:'unsupported';expectedName:string|null}
 | {kind:'range';expectedName:string|null;from:string;through:string;timeMin:string;timeMax:string};

const MONTHS:Record<string,number>={
 janvier:1,january:1,enero:1,januar:1,gennaio:1,
 fevrier:2,february:2,febrero:2,februar:2,febbraio:2,
 mars:3,march:3,marzo:3,marz:3,maerz:3,
 avril:4,april:4,abril:4,aprile:4,
 mai:5,may:5,mayo:5,maggio:5,
 juin:6,june:6,junio:6,juni:6,giugno:6,
 juillet:7,july:7,julio:7,juli:7,luglio:7,
 aout:8,august:8,agosto:8,
 septembre:9,september:9,septiembre:9,settembre:9,
 octobre:10,october:10,octubre:10,oktober:10,ottobre:10,
 novembre:11,november:11,noviembre:11,
 decembre:12,december:12,diciembre:12,dezember:12,dicembre:12,
};
function fold(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
export function matchesAuthorizedCalendarName(actual:string,requested:string):boolean{
 return Boolean(actual.trim())&&fold(actual)===fold(requested);
}
/** A short spoken label may omit only a generic Calendar/Agenda suffix.
 * A label can NEVER introduce a resource: the caller resolves among
 * revocable, explicitly scoped bound calendars and rejects ambiguity. */
export function matchesAuthorizedCalendarReadReference(actual:string,requested:string):boolean{
 const full=fold(actual),spoken=fold(requested);
 if(matchesAuthorizedCalendarName(actual,requested))return true;
 if(spoken.length<4)return false;
 return [' calendar',' agenda',' calendrier',' calendario',' kalender'].some(suffix=>
   full.endsWith(suffix)&&full.slice(0,-suffix.length).trim()===spoken);
}
function validDate(year:number,month:number,day:number):Date|null{
 if(!Number.isSafeInteger(year)||year<2000||year>2100||!Number.isSafeInteger(month)||month<1||month>12||!Number.isSafeInteger(day)||day<1||day>31)return null;
 const date=new Date(Date.UTC(year,month-1,day));
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date:null;
}
function parisMidnightUTC(date:Date):string{
 // The offset at the previous day's noon is the offset at the following
 // midnight, including the March/October daylight-saving transitions.
 const prevNoon=new Date(date.getTime()-12*3600000);
 const zone=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',timeZoneName:'shortOffset'}).formatToParts(prevNoon).find(p=>p.type==='timeZoneName')?.value??'';
 const m=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(zone);
 if(!m)throw Error('CALENDAR_TIMEZONE_UNAVAILABLE');
 const offset=m[1]+m[2].padStart(2,'0')+':'+(m[3]??'00');
 const key=date.toISOString().slice(0,10);
 return new Date(key+'T00:00:00'+offset).toISOString();
}
/** The caller supplies only already granted, scoped bindings; names are never a grant. */
export interface AuthorizedCalendarCandidate {
 readonly connectionId:string;readonly calendarId:string;readonly bindingId:string;readonly name:string;
}
export type AuthorizedCalendarChoice =
 | {kind:'selected';calendar:AuthorizedCalendarCandidate}
 | {kind:'missing'|'ambiguous'};
export function chooseAuthorizedCalendar(candidates:AuthorizedCalendarCandidate[],expectedName:string|null,
 preferred?:{connectionId?:string;calendarId?:string}):AuthorizedCalendarChoice{
 const matched=expectedName?candidates.filter(c=>matchesAuthorizedCalendarReadReference(c.name,expectedName)):candidates;
 if(!expectedName&&preferred?.connectionId&&preferred.calendarId){
  const selected=matched.filter(c=>c.connectionId===preferred.connectionId&&c.calendarId===preferred.calendarId);
  if(selected.length===1)return {kind:'selected',calendar:selected[0]};
 }
 if(matched.length===0)return {kind:'missing'};
 if(matched.length!==1)return {kind:'ambiguous'};
 return {kind:'selected',calendar:matched[0]};
}
export function parseNativeCalendarReadIntent(message:string,now:Date=new Date()):NativeCalendarReadIntent{
 // A named calendar in the prompt can be compared with a durable binding, not used to create one.
 const named=message.match(/\b(?:calendrier|calendar|calendario|kalender)\s+(?:«([^»\n]{1,160})»|"([^"\n]{1,160})"|“([^”\n]{1,160})”|([^.,!?\n]{1,160}?)(?=\s+(?:du|pour|from|on|del|vom|dal|(?:le|un|ce)\s+(?:rendez-vous|rdv)|les\s+(?:rendez-vous|événements))\b))/iu);
 const explicitLine=message.match(/^\s*(?:calendrier|calendar|calendario|kalender)\s*:\s*([^\n]{1,160})\s*$/imu);
 const expectedName=(explicitLine?.[1]??named?.[1]??named?.[2]??named?.[3]??named?.[4]??'').trim()||null;
 const range=message.match(/\b(?:du|from)\s+(\d{1,2})(?:er)?\s+(?:au|to)\s+(\d{1,2})\s+([a-zA-ZÀ-ÿ]+)\s+(?:de\s+)?(\d{4})\b/iu);
 // Do not accidentally reinterpret a missing-year two-day range as its last day.
 if(!range&&/\b(?:du|from)\s+\d{1,2}(?:er)?\s+(?:au|to)\s+\d{1,2}\b/iu.test(message))
   return {kind:'unsupported',expectedName};
 const single=range?null:message.match(/\b(?:(?:pour|le|du|on|del|vom|am|il|el)\s+)?(?:(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+)?(\d{1,2})(?:er)?\s+([a-zA-ZÀ-ÿ]+)(?:\s+(?:de\s+)?(\d{4}))?\b/iu);
 if(!range&&!single){
  if(/\b20\d{2}\b/.test(message)||/\b(?:du|from|del|vom|dal)\s+\d{1,2}\b/iu.test(message))return {kind:'unsupported',expectedName};
  return {kind:'default',expectedName};
 }
 const startDay=Number(range?.[1]??single?.[2]),endDay=Number(range?.[2]??single?.[2]);
 const month=MONTHS[fold(range?.[3]??single?.[3]??'')];
 const weekday=single?.[1]?fold(single[1]):null;
 const weekdayNumber:Record<string,number>={
  dimanche:0,sunday:0,lundi:1,monday:1,mardi:2,tuesday:2,mercredi:3,wednesday:3,
  jeudi:4,thursday:4,vendredi:5,friday:5,samedi:6,saturday:6,
 };
 let year=Number(range?.[4]??single?.[4]);
 if(single&&!single[4]){
   // In conversational follow-ups "lundi 9 novembre" refers to the nearby
   // calendar date, but NEVER infer a distant year or silently use today.
   if(!weekday||!Number.isFinite(now.getTime()))return {kind:'unsupported',expectedName};
   const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
   const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
   const currentYear=part('year'),today=Date.UTC(currentYear,part('month')-1,part('day'));
   const candidates=[currentYear-1,currentYear,currentYear+1].filter(y=>{
     const d=validDate(y,month,startDay);
     return d&&d.getUTCDay()===weekdayNumber[weekday]&&Math.abs(d.getTime()-today)<=31*86400000;
   });
   if(candidates.length!==1)return {kind:'unsupported',expectedName};
   year=candidates[0];
 }
 const start=validDate(year,month,startDay),last=validDate(year,month,endDay);
 if(single&&weekday&&start?.getUTCDay()!==weekdayNumber[weekday])return {kind:'unsupported',expectedName};
 if(!start||!last||last.getTime()<start.getTime()||last.getTime()-start.getTime()>30*86400000)return {kind:'unsupported',expectedName};
 const exclusive=new Date(last.getTime()+86400000);
 return {kind:'range',expectedName,from:start.toISOString().slice(0,10),
  through:last.toISOString().slice(0,10),timeMin:parisMidnightUTC(start),timeMax:parisMidnightUTC(exclusive)};
}
