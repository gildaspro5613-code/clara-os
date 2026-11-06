"use client";

import NativeDocumentsPanel from "@/components/native/NativeDocumentsPanel";
import {BUSINESS_TIME_ZONE,formatBusinessDate,agendaCalendarUrl,type AgendaPeriod} from "./calendar-window";
import {useBusinessDay} from "./useBusinessDay";
import {agendaPageReadErrorKey as calendarReadErrorKey} from "./calendar-read-state";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, MapPin, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface CalendarEvent {
  id?: string;
  summary?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
}

interface CalendarResponse {
  success: boolean;
  events: CalendarEvent[];
  message?: string;
  code?:string;
  nextPageToken?:string|null;
}

function formatTime(event: CalendarEvent, locale: string, allDay: string) {
  if (event.start?.date) {
    return allDay;
  }

  if (!event.start?.dateTime) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone:BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start.dateTime));
}

export default function AgendaStage() {
  const t = useTranslations("agendaPage");
  const locale = useLocale();
  const day=useBusinessDay(),statusText=useTranslations("cockpitUi");
  const settings=useRef<HTMLDetailsElement>(null);
  const [settingsMounted,setSettingsMounted]=useState(false);
  const [period,setPeriod]=useState<AgendaPeriod>('today');
  const [connections,setConnections]=useState<Array<{id:string;status:string;owned:boolean}>>([]);
  const [selectedAccount,setSelectedAccount]=useState(''),[accountChoice,setAccountChoice]=useState('');
  const [calendars,setCalendars]=useState<Array<{id:string;name:string;kind:string}>>([]);
  const [selectedCalendar,setSelectedCalendar]=useState(''),[calendarChoice,setCalendarChoice]=useState('');
  const [canSelectAccount,setCanSelectAccount]=useState(false),[calendarConsent,setCalendarConsent]=useState<boolean|null>(null);
  const [canSelectCalendar,setCanSelectCalendar]=useState(false),[selectionBusy,setSelectionBusy]=useState(false);
  const [selectionError,setSelectionError]=useState<ReturnType<typeof calendarReadErrorKey>|null>(null);
  const [showSelection,setShowSelection]=useState(false);
  const [metadataReady,setMetadataReady]=useState(false),[revision,setRevision]=useState(0);
  const [nextPage,setNextPage]=useState<string|null>(null),[moreLoading,setMoreLoading]=useState(false);
  const currentRead=useRef(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ReturnType<typeof calendarReadErrorKey>|null>(null);

  useEffect(()=>{
    if(settings.current&&(settings.current.open||['#native-google-document-authority','#agenda-settings'].includes(window.location.hash))){settings.current.open=true;setSettingsMounted(true);}
  },[]);
  function showSettings(){
    if(!settings.current)return;
    settings.current.open=true;setSettingsMounted(true);
    settings.current.scrollIntoView({block:'start',behavior:'smooth'});
    settings.current.querySelector('summary')?.focus();
  }
  useEffect(()=>{
    let cancelled=false;const controller=new AbortController();
    async function loadSelection(){
    setMetadataReady(false);setSelectionError(null);setConnections([]);setSelectedAccount('');setAccountChoice('');setCalendars([]);setSelectedCalendar('');setCalendarChoice('');setCanSelectCalendar(false);setCanSelectAccount(false);setCalendarConsent(null);
      try{
        const response=await fetch('/api/connections/google',{cache:'no-store',signal:controller.signal}),data=await response.json();
        if(cancelled)return;
        if(!response.ok||data.success!==true){setSelectionError(calendarReadErrorKey(response.status,data.code));return;}
        if(!Array.isArray(data.connections))throw Error('Invalid selection');
        const sessionResponse=await fetch('/api/native/runtime',{cache:'no-store',signal:controller.signal}),session=await sessionResponse.json();
        if(cancelled)return;
        if(!sessionResponse.ok||session.success!==true){setSelectionError(calendarReadErrorKey(sessionResponse.status,session.code));return;}
        setCanSelectAccount(session.permissions?.write===true);
        setConnections(data.connections);setSelectedAccount(data.selectedConnectionId??'');setAccountChoice(data.selectedConnectionId??'');
        const selected=data.connections.find((c:{id:string;status:string})=>c.id===data.selectedConnectionId&&c.status==='ACTIVE');
        if(!selected)return;
        const path='/api/native/google/work?'+new URLSearchParams({connectionId:selected.id,action:'capabilities'});
        const capsResponse=await fetch(path,{cache:'no-store',signal:controller.signal}),caps=await capsResponse.json();
        if(cancelled)return;
        if(!capsResponse.ok||caps.success!==true){setSelectionError(calendarReadErrorKey(capsResponse.status,caps.code));return;}
        setSelectedCalendar(caps.selectedCalendarId??'');setCalendarChoice(caps.selectedCalendarId??'');
        setCanSelectCalendar(session.permissions?.write===true&&caps.canManage===true&&caps.calendar===true);setCalendarConsent(caps.calendar===true);
        if(!caps.calendar)return;
        const resourcesResponse=await fetch('/api/native/google/work?'+new URLSearchParams({connectionId:selected.id,action:'resources'}),{cache:'no-store',signal:controller.signal}),resources=await resourcesResponse.json();
        if(cancelled)return;
        if(!resourcesResponse.ok||resources.success!==true){setSelectionError(calendarReadErrorKey(resourcesResponse.status,resources.code));return;}
        if(!Array.isArray(resources.resources))throw Error('Invalid resources');
        setCalendars(resources.resources.filter((resource:{kind:string})=>resource.kind==='calendar'));
      }catch{if(!cancelled)setSelectionError('agendaTemporarilyUnavailable');}
      finally{if(!cancelled)setMetadataReady(true);}
    }
    void loadSelection();return()=>{cancelled=true;controller.abort();};
  },[revision]);
  useEffect(()=>{const changed=()=>setRevision(value=>value+1);window.addEventListener('clara:google-work-updated',changed);return()=>window.removeEventListener('clara:google-work-updated',changed);},[]);
  useEffect(() => {
    if(!day)return;
    const generation=++currentRead.current;let cancelled=false;
    const controller=new AbortController();
    async function loadAgenda(){
      setLoading(true);setError(null);setEvents([]);setNextPage(null);setMoreLoading(false);
      try{
        const response=await fetch(agendaCalendarUrl(period),{cache:'no-store',signal:controller.signal});
        const data:CalendarResponse=await response.json();
        if(cancelled||generation!==currentRead.current)return;
        if(!response.ok||data.success!==true){setError(calendarReadErrorKey(response.status,data.code));return;}
        if(!Array.isArray(data.events))throw Error('Invalid calendar response');
        setEvents(data.events);setNextPage(data.nextPageToken??null);
      }catch{if(!cancelled&&generation===currentRead.current)setError('agendaTemporarilyUnavailable');}
      finally{if(!cancelled&&generation===currentRead.current)setLoading(false);}
    }
    void loadAgenda();return()=>{cancelled=true;controller.abort();};
  },[day,period,revision]);
  async function selectExisting(kind:'account'|'calendar'){
    if(selectionBusy)return;
    setSelectionBusy(true);setSelectionError(null);
    try{
      const response=await fetch(kind==='account'?'/api/connections/google':'/api/native/google/work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(kind==='account'?{action:'select',connectionId:accountChoice}:{action:'select',connectionId:selectedAccount,kind:'calendar',resourceId:calendarChoice})});
      const data=await response.json();if(!response.ok||data.success!==true){setSelectionError(calendarReadErrorKey(response.status,data.code));return;}
      window.dispatchEvent(new Event('clara:google-work-updated'));
    }catch{setSelectionError('agendaTemporarilyUnavailable');}finally{setSelectionBusy(false);}
  }
  async function moreEvents(){
    if(!nextPage||moreLoading)return;
    const generation=currentRead.current;setMoreLoading(true);
    try{
      const response=await fetch(agendaCalendarUrl(period)+'&'+new URLSearchParams({pageToken:nextPage}),{cache:'no-store'}),data=await response.json();
      if(generation!==currentRead.current)return;
      if(!response.ok||data.success!==true){setError(calendarReadErrorKey(response.status,data.code));setEvents([]);setNextPage(null);return;}
      if(!Array.isArray(data.events))throw Error('Invalid calendar response');
      setEvents(previous=>[...previous,...data.events.filter((event:CalendarEvent)=>!previous.some(e=>e.id&&e.id===event.id))]);setNextPage(data.nextPageToken??null);
    }catch{if(generation===currentRead.current){setError('agendaTemporarilyUnavailable');setEvents([]);setNextPage(null);}}
    finally{if(generation===currentRead.current)setMoreLoading(false);}
  }
  const errorText=(key:ReturnType<typeof calendarReadErrorKey>)=>key==='agendaConsentRequired'?t('consentRequired'):statusText(key);
  const action=error==='agendaConnectionRequired'?'chooseAccount':error==='agendaCalendarRequired'?'chooseCalendar':error==='agendaReconnectRequired'?'reconnectAccount':'reviewSettings';

  return (
    <main className="clara-glass-scroll min-h-full min-w-0 bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">
              CLARA OS
            </span>

            <h1 className="mt-3 text-4xl font-medium tracking-tight">
              {t("title")} — Mélodie Digital
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-white/50">
            <CalendarDays size={18} strokeWidth={1.6} />
            <time data-business-date dateTime={day??undefined}>{day?formatBusinessDate(day,locale):"—"}</time>
          </div>
        </header>

        <section data-agenda-selection aria-label={t('calendarSelection')} className="native-panel clara-glass-scroll mb-6 min-w-0 rounded-3xl border border-cyan-400/20 bg-white/[0.025] p-5 text-sm sm:p-7">
          <h2 className="mb-3 text-lg font-medium">{t('calendarSelection')}</h2>
          {!metadataReady?<p role="status">{t('loading')}</p>:<>
            {(!selectedCalendar||selectionError||showSelection)&&<div className="flex min-w-0 flex-wrap items-end gap-3">
              <label className="min-w-0 flex-1">{t('accountLabel')}<select aria-label={t('accountLabel')} value={accountChoice} disabled={selectionBusy} onChange={e=>setAccountChoice(e.target.value)} className="w-full">
                <option value="">{t('chooseAccount')}</option>{connections.map((connection,index)=><option key={connection.id} value={connection.id}>{t('accountNumber',{number:index+1})} · {t(connection.status==='ACTIVE'?'accountAvailable':connection.status==='RECONNECT_REQUIRED'?'accountReconnect':'accountUnavailable')}</option>)}
              </select></label>
              <button disabled={selectionBusy||!canSelectAccount||!accountChoice||accountChoice===selectedAccount||!connections.some(c=>c.id===accountChoice&&c.status==='ACTIVE')} onClick={()=>void selectExisting('account')}>{t('useAccount')}</button>
              <label className="min-w-0 flex-1">{t('calendarLabel')}<select aria-label={t('calendarLabel')} value={calendarChoice} disabled={selectionBusy||!canSelectCalendar} onChange={e=>setCalendarChoice(e.target.value)} className="w-full">
                <option value="">{t('chooseCalendar')}</option>{calendars.map(calendar=><option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}
              </select></label>
              <button disabled={selectionBusy||!canSelectCalendar||!calendarChoice||calendarChoice===selectedCalendar||!calendars.some(c=>c.id===calendarChoice)} onClick={()=>void selectExisting('calendar')}>{t('useCalendar')}</button>
            </div>}
            <p className="mt-3 text-slate-300">{selectionError?t('selectionUnavailable'):selectedCalendar?(calendars.some(c=>c.id===selectedCalendar)?t('calendarUsed',{name:calendars.find(c=>c.id===selectedCalendar)!.name}):t('selectionUnavailable')):t('calendarNotSelected')}</p>
            {calendarConsent===false&&<p role="status" className="mt-3 text-amber-100">{t('consentRequired')}</p>}
            {selectionError&&<p role="alert" className="mt-3 text-amber-100">{errorText(selectionError)}</p>}
          </>}
          {metadataReady&&selectedCalendar&&!selectionError&&<button type="button" className="mt-3" aria-expanded={showSelection} onClick={()=>setShowSelection(value=>!value)}>{t('changeSelection')}</button>}
          {(!selectedCalendar||selectionError)&&<button type="button" className="mt-4" onClick={showSettings}>{t('manageConnection')}</button>}
        </section>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
          <section data-agenda-events className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8">
            <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                  {t("myAgenda")}
                </span>

                <h2 className="mt-2 text-xl font-medium">
                  {loading||error?t("appointments"):t("eventCount", {count: events.length})}
                </h2>
              </div>
            </div>

            <div role="group" aria-label={t('periodLabel')} className="mb-5 flex flex-wrap gap-2">
              {(['today','week','upcoming'] as const).map(value=><button key={value} type="button" aria-pressed={period===value} onClick={()=>setPeriod(value)} className={'rounded-xl border px-4 py-2.5 text-sm '+(period===value?'border-cyan-300/50 bg-cyan-400/10 text-cyan-100':'border-white/15 text-slate-300')}>{t(value)}</button>)}
            </div>
            {loading && (
              <p className="py-10 text-sm text-white/45">
                {t("loading")}
              </p>
            )}

            {!loading && error && (
              <div className="py-6 text-sm text-white/65" data-agenda-read-state={error}>
                <p role="status">{errorText(error)}</p>
                {error==='agendaSessionExpired'?<a className="mt-4 inline-flex rounded-xl border border-cyan-300/20 px-4 py-2 text-cyan-100" href="/api/auth/google/start">{t('signIn')}</a>:<button type="button" className="mt-4 rounded-xl border border-cyan-300/20 px-4 py-2 text-cyan-100" onClick={showSettings}>{t(action)}</button>}
              </div>
            )}

            {!loading && !error && events.length === 0 && (
              <div className="py-10">
                <p className="text-base text-white/65">
                  {t(period==='today'?"empty":"emptyPeriod")}
                </p>

                <p className="mt-2 text-sm text-white/35">
                  {t("emptyPeriodHelp")}
                </p>
              </div>
            )}

            {!loading && !error && events.length > 0 && (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <article
                    key={event.id ?? `${event.summary}-${index}`}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-cyan-400/20"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
                      <div className="flex min-w-[76px] items-start gap-2 pt-1 text-xs text-white/40">
                        <Clock size={14} strokeWidth={1.6} />
                        <span>{period!=='today'&&(event.start?.dateTime||event.start?.date)&&<span className="mb-1 block">{new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,day:'numeric',month:'short'}).format(new Date(event.start.dateTime??event.start.date+'T12:00:00Z'))}</span>}{formatTime(event, locale, t("allDay"))}{event.end?.dateTime&&' – '+new Intl.DateTimeFormat(locale,{timeZone:BUSINESS_TIME_ZONE,hour:'2-digit',minute:'2-digit'}).format(new Date(event.end.dateTime))}</span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-base font-medium text-white/90">
                          {event.summary || t("untitled")}
                        </h3>

                        {event.location && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
                            <MapPin size={13} strokeWidth={1.6} />
                            <span className="truncate">
                              {event.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!loading&&!error&&nextPage&&<button type="button" disabled={moreLoading} onClick={()=>void moreEvents()} className="mt-5 rounded-xl border border-cyan-300/30 px-4 py-2 text-cyan-100">{t(moreLoading?'loading':'moreEvents')}</button>}
          </section>

          <aside className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8">
            <MessageCircle size={24} className="mb-4 text-cyan-300" aria-hidden="true"/>
            <h2 className="text-xl font-medium">Clara</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{t('claraHelp')}</p>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-400">{['claraToday','claraAvailability','claraPrepare'].map(key=><li key={key}>“{t(key)}”</li>)}</ul>
            <a href="/clara" className="mt-6 inline-flex rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{t('talkToClara')}</a>
            <p className="mt-4 text-xs leading-6 text-slate-400">{t('confirmationHelp')}</p>
            <button type="button" className="mt-5 rounded-xl border border-white/20 px-4 py-2.5 text-sm text-slate-200" onClick={showSettings}>{t('manualPreparation')}</button>
          </aside>
        </div>
        <details ref={settings} id="agenda-settings" data-agenda-settings onToggle={event=>{if(event.currentTarget.open)setSettingsMounted(true);}} className="mt-6 min-w-0 max-w-full rounded-2xl border border-cyan-300/20 p-3 sm:p-5 [&_fieldset]:min-w-0 [&_label]:min-w-0 [&_label]:max-w-full [&_fieldset]:max-w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input:not([type=checkbox])]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_textarea]:max-w-full [&_button]:whitespace-normal [&_button]:break-words [&_.native-panel]:p-3 sm:[&_.native-panel]:p-5">
          <summary className="cursor-pointer text-sm font-medium text-cyan-100 focus-visible:outline focus-visible:outline-cyan-200">{t('advancedSettings')}</summary>
          <p className="mt-3 text-sm text-slate-400">{t('advancedHelp')}</p>
          {settingsMounted&&<NativeDocumentsPanel workspaceMode="agenda"/>}
        </details>
      </div>
    </main>
  );
}
