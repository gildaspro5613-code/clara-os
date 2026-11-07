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
export function parseNativeCalendarReadIntent(message:string):NativeCalendarReadIntent{
 const m=message.match(/\b(?:calendrier|calendar|calendario|kalender)\s+(.+?)\s+(?:du|from|del|vom|dal|dall['’])\s+\d{1,2}/iu);
 const expectedName=m?.[1]?.trim().replace(/^["“«']+|["”»']+$/g,'').trim()||null;
 const range=message.match(/\b(?:du|from)\s+(\d{1,2})(?:er)?\s+(?:au|to)\s+(\d{1,2})\s+([a-zA-ZÀ-ÿ]+)\s+(?:de\s+)?(\d{4})\b/iu);
 if(!range){
  if(/\b20\d{2}\b/.test(message)||/\b(?:du|from|del|vom|dal)\s+\d{1,2}\b/iu.test(message))return {kind:'unsupported',expectedName};
  return {kind:'default',expectedName};
 }
 const startDay=Number(range[1]),endDay=Number(range[2]),month=MONTHS[fold(range[3])],year=Number(range[4]);
 const start=validDate(year,month,startDay),last=validDate(year,month,endDay);
 if(!start||!last||last.getTime()<start.getTime()||last.getTime()-start.getTime()>30*86400000)return {kind:'unsupported',expectedName};
 const exclusive=new Date(last.getTime()+86400000);
 return {kind:'range',expectedName,from:start.toISOString().slice(0,10),
  through:last.toISOString().slice(0,10),timeMin:parisMidnightUTC(start),timeMax:parisMidnightUTC(exclusive)};
}
