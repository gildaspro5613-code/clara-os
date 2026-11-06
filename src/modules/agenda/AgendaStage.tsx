'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {CalendarDays,ChevronLeft,ChevronRight,MessageCircle,X,MapPin} from 'lucide-react';
import {useBusinessDay} from './useBusinessDay';
import {BUSINESS_TIME_ZONE,formatBusinessDate} from './calendar-window';
import {agendaPageReadErrorKey} from './calendar-read-state';
import {calendarRange,addCivilDays,navigateCalendar,eventsOnDay,isCalendarBanner,timeSegments,eventKey,eventTime,type CalendarView,type GoogleCalendarEvent} from './calendar-view';
const administration='/connexions#google-agenda-administration';
type ReadError=ReturnType<typeof agendaPageReadErrorKey>;
function EventDetails({event,close}:{event:GoogleCalendarEvent;close:()=>void}){
 const t=useTranslations('agendaCalendar'),locale=useLocale(),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{if(trigger?.isConnected)trigger.focus();};},[]);
 const date=(value?:{date?:string;dateTime?:string})=>{
  if(value?.date)return formatBusinessDate(value.date,locale);
  return value?.dateTime?new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,dateStyle:'full',timeStyle:'long'}).format(new Date(value.dateTime)):'';
 };
 return <dialog ref={dialog} data-agenda-details aria-label={t('details')} onClose={close} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.current?.close();}}} className="agenda-event-dialog clara-glass-scroll">
  <div className="flex items-start justify-between gap-4"><h2>{event.summary||t('untitled')}</h2><button type="button" autoFocus aria-label={t('close')} onClick={()=>dialog.current?.close()}><X size={20}/></button></div>
  <dl><dt>{t('starts')}</dt><dd>{date(event.start)}</dd><dt>{t('ends')}</dt><dd>{event.start?.date&&event.end?.date?formatBusinessDate(addCivilDays(event.end.date,-1),locale):date(event.end)}</dd>{event.location&&<><dt>{t('location')}</dt><dd>{event.location}</dd></>}</dl>
  {event.description&&<p className="whitespace-pre-wrap">{event.description}</p>}
  <p className="mt-5 text-xs text-slate-400">{t('readOnly')}</p>
 </dialog>;
}
export default function AgendaStage(){
 const t=useTranslations('agendaCalendar'),old=useTranslations('agendaPage'),status=useTranslations('cockpitUi'),locale=useLocale(),today=useBusinessDay();
 const [view,setView]=useState<CalendarView>('week'),[anchor,setAnchor]=useState<string|null>(null);
 const day=anchor??today,range=day?calendarRange(day,view):null,url=range?.url;
 const [events,setEvents]=useState<GoogleCalendarEvent[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<ReadError|null>(null);
 const [pageToken,setPageToken]=useState<string|null>(null),[moreBusy,setMoreBusy]=useState(false),[refresh,setRefresh]=useState(0);
 const [calendarName,setCalendarName]=useState(''),[selectedKey,setSelectedKey]=useState<string|null>(null);
 const generation=useRef(0),scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{const update=()=>setRefresh(value=>value+1);window.addEventListener('clara:google-work-updated',update);return()=>window.removeEventListener('clara:google-work-updated',update);},[]);
 useEffect(()=>{
  let active=true;const controller=new AbortController();
  async function label(){
   setCalendarName('');
   try{
    const response=await fetch('/api/connections/google',{cache:'no-store',signal:controller.signal}),connections=await response.json();
    if(!response.ok||connections.success!==true||!Array.isArray(connections.connections))return;
    const selected=connections.connections.find((c:{id:string;status:string})=>c.id===connections.selectedConnectionId&&c.status==='ACTIVE');if(!selected)return;
    const base='/api/native/google/work?'+new URLSearchParams({connectionId:selected.id});
    const capsResponse=await fetch(base+'&action=capabilities',{cache:'no-store',signal:controller.signal}),caps=await capsResponse.json();if(!capsResponse.ok||!caps.success||!caps.calendar||!caps.selectedCalendarId)return;
    const resourcesResponse=await fetch(base+'&action=resources',{cache:'no-store',signal:controller.signal}),resources=await resourcesResponse.json();
    if(active&&resourcesResponse.ok&&resources.success&&Array.isArray(resources.resources))setCalendarName(resources.resources.find((r:{id:string;kind:string})=>r.id===caps.selectedCalendarId&&r.kind==='calendar')?.name??'');
   }catch{/* An unverified name is withheld; the canonical Calendar read reports the actual availability. */}
  }
  void label();return()=>{active=false;controller.abort();};
 },[refresh]);
 useEffect(()=>{
  if(!url)return;
  const current=++generation.current,controller=new AbortController();let active=true;
  async function read(){
   setLoading(true);setEvents([]);setError(null);setPageToken(null);setMoreBusy(false);setSelectedKey(null);
   try{
    const response=await fetch(url!,{cache:'no-store',signal:controller.signal}),body=await response.json();
    if(!active||current!==generation.current)return;
    if(!response.ok||body.success!==true){setError(agendaPageReadErrorKey(response.status,body.code));return;}
    if(!Array.isArray(body.events))throw Error('Invalid Calendar response');
    setEvents(body.events);setPageToken(body.nextPageToken??null);
   }catch{if(active&&current===generation.current)setError('agendaTemporarilyUnavailable');}
   finally{if(active&&current===generation.current)setLoading(false);}
  }
  void read();return()=>{active=false;controller.abort();};
 },[url,refresh]);
 useEffect(()=>{if(!loading&&view!=='month'&&scroll.current)scroll.current.scrollTop=480;},[loading,view,url]);
 async function more(){
  if(!url||!pageToken||moreBusy)return;const current=generation.current;setMoreBusy(true);
  try{
   const response=await fetch(url+'&'+new URLSearchParams({pageToken}),{cache:'no-store'}),body=await response.json();if(current!==generation.current)return;
   if(!response.ok||body.success!==true){setEvents([]);setPageToken(null);setSelectedKey(null);setError(agendaPageReadErrorKey(response.status,body.code));return;}
   if(!Array.isArray(body.events))throw Error('Invalid Calendar response');
   setEvents(previous=>[...previous,...body.events.filter((event:GoogleCalendarEvent)=>!previous.some(old=>eventKey(old)===eventKey(event)))]);setPageToken(body.nextPageToken??null);
  }catch{if(current===generation.current){setEvents([]);setSelectedKey(null);setError('agendaTemporarilyUnavailable');}}
  finally{if(current===generation.current)setMoreBusy(false);}
 }
 const details=selectedKey?events.find(event=>eventKey(event)===selectedKey):undefined;
 const title=day?(view==='month'?new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,month:'long',year:'numeric'}).format(new Date(day+'T12:00:00Z')):view==='week'&&range?new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,day:'numeric',month:'short',year:'numeric'}).formatRange(new Date(range.start+'T12:00:00Z'),new Date(navigateCalendar(range.end,'day',-1)+'T12:00:00Z')):formatBusinessDate(day,locale)):'—';
 const errorText=error==='agendaConnectionRequired'?t('connectionRequired'):error==='agendaCalendarRequired'?t('calendarRequired'):error==='agendaConsentRequired'?old('consentRequired'):error?status(error):'';
 const eventButton=(event:GoogleCalendarEvent,key:string,style?:React.CSSProperties)=> <button type="button" key={key} data-agenda-event={eventKey(event)} className="agenda-event" style={style} aria-label={(event.summary||t('untitled'))+' · '+eventTime(event,locale,t('allDay'))} onClick={()=>setSelectedKey(eventKey(event))}><span>{eventTime(event,locale,t('allDay'))}</span><strong>{event.summary||t('untitled')}</strong></button>;
 return <main className="agenda-calendar clara-glass-scroll" data-agenda-view={view}>
  <header className="agenda-heading"><div><p className="agenda-eyebrow">CLARA OS · MÉLODIE DIGITAL</p><h1>{old('title')}</h1><p>{old('subtitle')}</p></div><a href="/clara" className="agenda-primary"><MessageCircle size={18}/>{old('talkToClara')}</a></header>
  <section className="agenda-calendar-panel" aria-busy={loading||moreBusy} data-agenda-events aria-label={t('myCalendar')}>
   <div className="agenda-toolbar"><div className="agenda-period"><CalendarDays size={20} aria-hidden="true"/><h2 aria-live="polite">{view==='day'&&day?<time data-business-date dateTime={day}>{title}</time>:title}</h2></div><div className="agenda-controls">
    <button type="button" disabled={!today} onClick={()=>setAnchor(null)}>{t('today')}</button><button type="button" disabled={!day} aria-label={t('previous')} onClick={()=>day&&setAnchor(navigateCalendar(day,view,-1))}><ChevronLeft size={18}/></button><button type="button" disabled={!day} aria-label={t('next')} onClick={()=>day&&setAnchor(navigateCalendar(day,view,1))}><ChevronRight size={18}/></button>
    <div role="group" aria-label={t('view')} className="agenda-mode">{(['day','week','month'] as const).map(value=><button key={value} type="button" aria-pressed={view===value} onClick={()=>setView(value)}>{t(value)}</button>)}</div>
   </div></div>
   <div className="agenda-calendar-source"><span>{calendarName&&!error?calendarName:'Google Agenda'}</span><a href={administration}>{t('manageCalendar')}</a></div>
   {loading?<p role="status" className="agenda-state">{t('loading')}</p>:error?<div data-agenda-read-state={error} className="agenda-state"><p role="status">{errorText}</p><a className="agenda-primary" href={error==='agendaSessionExpired'?'/api/auth/google/start':administration}>{t(error==='agendaSessionExpired'?'signIn':error==='agendaCalendarRequired'?'chooseCalendar':error==='agendaConnectionRequired'?'chooseAccount':'reviewConnection')}</a></div>:<>
    {events.length===0&&!pageToken&&<p role="status" className="agenda-empty">{t('empty')}</p>}
    {range&&(view==='month'?<div role="grid" aria-label={title} className="agenda-month">
     <div role="row" className="agenda-month-row">{range.days.slice(0,7).map(date=><div key={date} role="columnheader" className="agenda-weekday">{new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,weekday:'short'}).format(new Date(date+'T12:00:00Z'))}</div>)}</div>
     {Array.from({length:range.days.length/7},(_,row)=><div role="row" className="agenda-month-row" key={row}>{range.days.slice(row*7,row*7+7).map(date=>{const items=eventsOnDay(events,date);return <div role="gridcell" key={date} data-calendar-day={date} className={'agenda-month-day '+(date.slice(0,7)!==day?.slice(0,7)?'agenda-outside ':'')+(date===today?'agenda-is-today':'')}><button type="button" className="agenda-day-number" aria-label={formatBusinessDate(date,locale)} onClick={()=>{setAnchor(date);setView('day');}}>{Number(date.slice(-2))}</button>{items.slice(0,3).map((event,index)=>eventButton(event,eventKey(event)+index))}{items.length>3&&<button type="button" className="agenda-extra" onClick={()=>{setAnchor(date);setView('day');}}>{t('moreOnDay',{count:items.length-3})}</button>}</div>;})}</div>)}
    </div>:<div ref={scroll} className={'agenda-time-scroll clara-glass-scroll '+(view==='week'?'agenda-week-scroll':'')} tabIndex={0} aria-label={t('timeGrid')}><div className={'agenda-time-grid '+(view==='week'?'agenda-seven-days':'')}>
     <div className="agenda-time-label-header"/>{range.days.map(date=><div key={date} className={'agenda-day-heading '+(date===today?'agenda-is-today':'')}>{new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,weekday:'short',day:'numeric',month:'short'}).format(new Date(date+'T12:00:00Z'))}</div>)}
     <div className="agenda-all-day-label">{t('allDay')}</div>{range.days.map(date=><div key={date} className="agenda-all-day">{eventsOnDay(events,date).filter(isCalendarBanner).map((event,index)=>eventButton(event,eventKey(event)+index))}</div>)}
     <div className="agenda-hours">{Array.from({length:24},(_,hour)=><span key={hour} style={{top:hour*60}}>{String(hour).padStart(2,'0')}:00</span>)}</div>
     {range.days.map(date=><div key={date} data-calendar-day={date} className="agenda-day-column">{timeSegments(events,date).map((segment,index)=>eventButton(segment.event,eventKey(segment.event)+index,{top:segment.top,height:segment.bottom-segment.top,left:`calc(${segment.lane/segment.lanes*100}% + 2px)`,width:`calc(${100/segment.lanes}% - 4px)`}))}</div>)}
    </div></div>)}
    {pageToken&&<div className="agenda-pagination"><p>{t('partial')}</p><button type="button" disabled={moreBusy} onClick={()=>void more()}>{t(moreBusy?'loading':'loadMore')}</button></div>}
   </>}
  </section>
  <p className="agenda-help"><MapPin size={14} aria-hidden="true"/>{t('timezone')} · {t('readOnly')}</p>
  {details&&!error&&!loading&&<EventDetails key={eventKey(details)} event={details} close={()=>setSelectedKey(null)}/>}
 </main>;
}
