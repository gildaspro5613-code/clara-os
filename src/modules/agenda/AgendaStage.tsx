"use client";

import NativeDocumentsPanel from "@/components/native/NativeDocumentsPanel";
import {BUSINESS_TIME_ZONE,formatBusinessDate,todayCalendarUrl} from "./calendar-window";
import {useBusinessDay} from "./useBusinessDay";
import {calendarReadErrorKey} from "./calendar-read-state";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
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
  useEffect(() => {
    if(!day)return;
    let cancelled=false,sequence=0;let controller:AbortController|undefined;
    async function loadAgenda(){
      const current=++sequence;controller?.abort();controller=new AbortController();setLoading(true);
      try{
        const response=await fetch(todayCalendarUrl(),{cache:'no-store',signal:controller.signal});
        const data:CalendarResponse=await response.json();
        if(!response.ok||data.success!==true){if(!cancelled&&current===sequence){setEvents([]);setError(calendarReadErrorKey(response.status,data.code));}return;}
        if(!Array.isArray(data.events))throw Error('Invalid calendar response');
        if(!cancelled&&current===sequence){setEvents(data.events);setError(null);}
      }catch{if(!cancelled&&current===sequence){setEvents([]);setError('agendaTemporarilyUnavailable');}}
      finally{if(!cancelled&&current===sequence)setLoading(false);}
    }
    void loadAgenda();const changed=()=>{void loadAgenda();};window.addEventListener('clara:google-work-updated',changed);
    return()=>{cancelled=true;controller?.abort();window.removeEventListener('clara:google-work-updated',changed);};
  },[day]);
  const action=error==='agendaConnectionRequired'?'chooseAccount':error==='agendaCalendarRequired'?'chooseCalendar':error==='agendaReconnectRequired'?'reconnectAccount':'reviewSettings';

  return (
    <main className="min-h-full min-w-0 bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">
              CLARA OS
            </span>

            <h1 className="mt-3 text-4xl font-medium tracking-tight">
              {t("title")}
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

        <button type="button" className="mb-6 rounded-xl border border-cyan-300/20 px-4 py-2.5 text-sm text-cyan-100 hover:bg-cyan-300/10" onClick={showSettings}>{t("settingsAndOperations")}</button>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
          <section data-agenda-events className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8">
            <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                  {t("today")}
                </span>

                <h2 className="mt-2 text-xl font-medium">
                  {loading||error?t("appointments"):t("eventCount", {count: events.length})}
                </h2>
              </div>
            </div>

            {loading && (
              <p className="py-10 text-sm text-white/45">
                {t("loading")}
              </p>
            )}

            {!loading && error && (
              <div className="py-6 text-sm text-white/65" data-agenda-read-state={error}>
                <p role="status">{statusText(error)}</p>
                {error==='agendaSessionExpired'?<a className="mt-4 inline-flex rounded-xl border border-cyan-300/20 px-4 py-2 text-cyan-100" href="/api/auth/google/start">{t('signIn')}</a>:<button type="button" className="mt-4 rounded-xl border border-cyan-300/20 px-4 py-2 text-cyan-100" onClick={showSettings}>{t(action)}</button>}
              </div>
            )}

            {!loading && !error && events.length === 0 && (
              <div className="py-10">
                <p className="text-base text-white/65">
                  {t("empty")}
                </p>

                <p className="mt-2 text-sm text-white/35">
                  {t("emptyHelp")}
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
                        <span>{formatTime(event, locale, t("allDay"))}</span>
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
          </section>

          <aside className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8">
            <span className="text-[10px] uppercase tracking-[0.24em] text-cyan-400/70">
              {t("context")}
            </span>

            <div className="mt-8 border-b border-white/10 pb-7">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                {t("events")}
              </span>

              <p className="mt-3 text-2xl font-medium">
                {loading||error?"—":events.length}
              </p>
            </div>

            <div className="py-7 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                {t("latestActivity")}
              </span>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {loading?t("loading"):error?t("unavailable"):events.length > 0 ? t("identified", {count: events.length}) : t("noneRecorded")}
              </p>
            </div>

            <div className="pt-7">
              <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">
                CLARA
              </span>

              <p className="mt-4 text-sm leading-7 text-white/60">
                {t("claraHelp")}
              </p>
            </div>
          </aside>
        </div>
        <details ref={settings} id="agenda-settings" data-agenda-settings onToggle={event=>{if(event.currentTarget.open)setSettingsMounted(true);}} className="mt-6 min-w-0 max-w-full rounded-2xl border border-cyan-300/20 p-3 sm:p-5 [&_fieldset]:min-w-0 [&_label]:min-w-0 [&_label]:max-w-full [&_input]:min-w-0 [&_input]:max-w-full [&_input:not([type=checkbox])]:w-full [&_select]:min-w-0 [&_select]:max-w-full [&_textarea]:max-w-full [&_button]:whitespace-normal [&_button]:break-words [&_.native-panel]:p-3 sm:[&_.native-panel]:p-5">
          <summary className="cursor-pointer text-sm font-medium text-cyan-100 focus-visible:outline focus-visible:outline-cyan-200">{t('advancedSettings')}</summary>
          <p className="mt-3 text-sm text-slate-400">{t('advancedHelp')}</p>
          {settingsMounted&&<NativeDocumentsPanel workspaceMode="agenda"/>}
        </details>
      </div>
    </main>
  );
}
