import type {Locale} from '@/i18n/types';
import type {BrainSourceContext} from '@/lib/brain/brain-source';

/** Display only evidence from an already-authorized Google Calendar READ.
 * Does not call a provider, execute an operation, or alter native permissions.
 */
type CalendarEvent={summary?:unknown;start?:{dateTime?:unknown};end?:{dateTime?:unknown}};
type CalendarRead={success?:unknown;calendarId?:unknown;calendarName?:unknown;partial?:unknown;range?:{timeMin?:unknown;timeMax?:unknown};events?:unknown};
const fold=(value:string)=>value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const label=(value:unknown,max=160):string|null=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[\x00-\x1f\x7f]/.test(value)?value.trim():null;
function parisHour(d:Date,locale:Locale):string{
 if(locale!=='fr')return new Intl.DateTimeFormat(locale,{timeZone:'Europe/Paris',hour:'numeric',minute:'2-digit'}).format(d);
 const f=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const h=f.find(v=>v.type==='hour')?.value,m=f.find(v=>v.type==='minute')?.value;
 return h&&m?Number(h)+' h'+(m==='00'?'':' '+m):'';
}
export function naturalVerifiedCalendarReply(message:string,sources:readonly BrainSourceContext[],locale:Locale):string|null{
 // Exact event lookup only. For detailed, incomplete or ambiguous requests, the regular composer remains authoritative.
 if(!/\b(?:retrouv\w*|trouv\w*|v[ée]rifi\w*|confirm\w*|exist\w*|find|check|verify|confirm|encontr\w*|busc\w*|pr[üu]f\w*|trov\w*)\b/iu.test(message))return null;
 if(/\b(?:plusieurs|tous|toutes|all events|alle termine|todos los eventos)\b/iu.test(message))return null;
 // A mixed read + write command requires the normal authorized workflow, never a quick reply.
 if(/\b(?:et|puis|then|and)\s+(?:cr[ée]e|ajoute|supprime|modifie|d[ée]place|annule|create|delete|update|cancel)\b/iu.test(message))return null;
 if(/\b(?:d[ée]tails?|fournisseur|utc|identifiant|journal|preuve\s+technique|source\s+brute|json|raw|timestamps?|audit)\b/iu.test(message))return null;
 const reads=sources.filter(s=>s.source==='google-calendar');
 if(reads.length!==1||reads[0].available!==true)return null;
 const data=reads[0].data as CalendarRead|null;
 if(!data||data.success!==true||data.partial!==false||!label(data.calendarId,400))return null;
 const calendarName=label(data.calendarName),range=data.range;
 if(!calendarName||!range||typeof range.timeMin!=='string'||typeof range.timeMax!=='string')return null;
 const low=Date.parse(range.timeMin),high=Date.parse(range.timeMax);
 if(!Number.isFinite(low)||!Number.isFinite(high)||high<=low||high-low>32*86400000||!Array.isArray(data.events))return null;
 const requested=fold(message);
 const matches=(data.events as CalendarEvent[]).filter(item=>{
  const title=label(item?.summary,200);
  if(!title||fold(title).length<10||fold(title).split(' ').length<3||!requested.includes(fold(title)))return false;
  const begin=typeof item?.start?.dateTime==='string'?Date.parse(item.start.dateTime):NaN;
  const end=typeof item?.end?.dateTime==='string'?Date.parse(item.end.dateTime):NaN;
  return Number.isFinite(begin)&&Number.isFinite(end)&&begin>=low&&begin<high&&end>begin&&end<=high;
 });
 if(matches.length!==1)return null;
 const item=matches[0],title=label(item.summary)!;
 const begin=new Date(item.start!.dateTime as string),end=new Date(item.end!.dateTime as string);
 const date=new Intl.DateTimeFormat(locale,{timeZone:'Europe/Paris',dateStyle:'full'}).format(begin);
 const a=parisHour(begin,locale),b=parisHour(end,locale);
 if(!a||!b)return null;
 switch(locale){
  case 'en':return 'Yes, I found it! “'+title+'” is in '+calendarName+' on '+date+', from '+a+' to '+b+'. I haven’t changed anything.';
  case 'es':return '¡Sí, lo encontré! «'+title+'» está en '+calendarName+' el '+date+', de '+a+' a '+b+'. No he modificado nada.';
  case 'de':return 'Ja, ich habe den Termin gefunden! „'+title+'“ steht am '+date+' von '+a+' bis '+b+' in '+calendarName+'. Ich habe nichts geändert.';
  case 'it':return 'Sì, l’ho trovato! «'+title+'» è nel calendario '+calendarName+' per '+date+', dalle '+a+' alle '+b+'. Non ho modificato nulla.';
  default:return 'Oui, je l’ai retrouvé ! « '+title+' » est bien dans '+calendarName+' pour le '+date+', de '+a+' à '+b+'. Je n’ai rien modifié.';
 }
}
