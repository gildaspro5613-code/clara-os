"use client";

import { useEffect, useState } from "react";
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
}

function formatTime(event: CalendarEvent, locale: string, allDay: string) {
  if (event.start?.date) {
    return allDay;
  }

  if (!event.start?.dateTime) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start.dateTime));
}

export default function AgendaStage() {
  const t = useTranslations("agendaPage");
  const locale = useLocale();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAgenda() {
      try {
        const response = await fetch("/api/calendar", {
          cache: "no-store",
        });

        const data: CalendarResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message ?? t("unavailable"));
        }

        if (!cancelled) {
          setEvents(data.events ?? []);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAgenda();

    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="min-h-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
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
            <span className="capitalize">{today}</span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:p-8">
            <div className="mb-7 flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                  {t("today")}
                </span>

                <h2 className="mt-2 text-xl font-medium">
                  {t("eventCount", {count: events.length})}
                </h2>
              </div>
            </div>

            {loading && (
              <p className="py-10 text-sm text-white/45">
                {t("loading")}
              </p>
            )}

            {!loading && error && (
              <p className="py-10 text-sm text-white/45">
                {t("temporarilyUnavailable")}
              </p>
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
                    <div className="flex gap-5">
                      <div className="flex min-w-[76px] items-start gap-2 pt-1 text-xs text-white/40">
                        <Clock size={14} strokeWidth={1.6} />
                        <span>{formatTime(event, locale, t("allDay"))}</span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base font-medium text-white/90">
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

          <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 lg:p-8">
            <span className="text-[10px] uppercase tracking-[0.24em] text-cyan-400/70">
              {t("context")}
            </span>

            <div className="mt-8 border-b border-white/10 pb-7">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                {t("events")}
              </span>

              <p className="mt-3 text-2xl font-medium">
                {events.length}
              </p>
            </div>

            <div className="py-7 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                {t("latestActivity")}
              </span>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {events.length > 0 ? t("identified", {count: events.length}) : t("noneRecorded")}
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
      </div>
    </main>
  );
}
