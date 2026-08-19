"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";

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

function formatTime(event: CalendarEvent) {
  if (event.start?.date) {
    return "Toute la journée";
  }

  if (!event.start?.dateTime) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(event.start.dateTime));
}

export default function AgendaWidget() {
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
          throw new Error(data.message ?? "Agenda indisponible");
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

  return (
    <article
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border border-white/10
        bg-white/[0.045]
        p-5
        backdrop-blur-xl
        transition
        duration-300
        hover:bg-white/[0.065]
      "
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70"
      />

      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays
            size={20}
            strokeWidth={1.7}
            className="text-white/65"
          />

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Agenda
            </p>

            <p className="mt-1 text-sm text-white/75">
              Aujourd'hui
            </p>
          </div>
        </div>

        <span className="text-xs text-white/35">
          {events.length} événement{events.length > 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div className="py-6 text-sm text-white/45">
          Clara consulte votre agenda…
        </div>
      )}

      {!loading && error && (
        <div className="py-6 text-sm text-white/45">
          Agenda momentanément indisponible.
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="py-6">
          <p className="text-sm text-white/65">
            Aucun rendez-vous prévu aujourd'hui.
          </p>

          <p className="mt-1 text-xs text-white/35">
            Votre journée semble dégagée.
          </p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="space-y-2">
          {events.slice(0, 4).map((event, index) => (
            <div
              key={event.id ?? `${event.summary}-${index}`}
              className="
                flex
                items-start
                gap-4
                rounded-[16px]
                border
                border-white/[0.07]
                bg-black/20
                px-4
                py-3
              "
            >
              <div className="flex min-w-[58px] items-center gap-1.5 pt-0.5 text-xs text-white/45">
                <Clock size={13} strokeWidth={1.6} />
                <span>{formatTime(event)}</span>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/85">
                  {event.summary || "Événement sans titre"}
                </p>

                {event.location && (
                  <p className="mt-1 truncate text-xs text-white/40">
                    {event.location}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/agenda"
        className="
          mt-5
          flex
          items-center
          gap-1.5
          text-xs
          text-white/45
          transition
          hover:text-white/75
        "
      >
        Voir l'agenda
        <ChevronRight size={14} strokeWidth={1.7} />
      </Link>
    </article>
  );
}
