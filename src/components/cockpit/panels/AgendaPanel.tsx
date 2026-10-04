"use client";

import { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import { useLocale, useTranslations } from "next-intl";

interface CalendarEvent {
  id?: string;
  summary?: string;
  start?: {
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
  if (event.start?.date) return allDay;
  if (!event.start?.dateTime) return "";

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start.dateTime));
}

/**
 * Compact Hero view of the same real Google Calendar source used by Agenda.
 * No synthetic appointments or demo schedule belong in the operational Hero.
 */
export default function AgendaPanel() {
  const t = useTranslations("cockpitUi");
  const locale = useLocale();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAgenda() {
      try {
        const response = await fetch("/api/calendar", { cache: "no-store" });
        const data: CalendarResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message ?? t("agendaUnavailable"));
        }

        if (!cancelled) setEvents(data.events ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAgenda();
    return () => { cancelled = true; };
  }, []);

  return (
    <GlassPanel className="h-auto w-[15rem] px-5 py-4 bg-black/25 border-white/[0.08] shadow-[0_2px_16px_rgba(0,0,0,0.16)]">
      <h3 className="mb-3 text-sm font-medium tracking-[0.08em] uppercase text-white/74">
        {t("today")}
      </h3>

      {loading && <p className="text-sm text-white/45">{t("agendaLoading")}</p>}
      {!loading && error && <p className="text-sm text-white/45">{t("agendaTemporarilyUnavailable")}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-sm text-white/58">{t("noAppointments")}</p>
      )}

      {!loading && !error && events.length > 0 && (
        <ul className="space-y-2">
          {events.slice(0, 3).map((event, index) => (
            <li key={event.id ?? `${event.summary}-${index}`} className="flex items-baseline gap-3 text-white/78">
              <span className="text-xs font-medium tabular-nums text-white/66">
                {formatTime(event, locale, t("allDay"))}
              </span>
              <span className="min-w-0 truncate text-sm">
                {event.summary || t("agenda")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
