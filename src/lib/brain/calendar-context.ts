/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : calendar-context.ts
 * Responsibility :
 * Provides agenda context to Clara's Brain
 * through the configured calendar connector.
 * ============================================
 */

export interface BrainCalendarEvent {
  id: string;
  title: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
}

export interface BrainCalendarContext {
  available: boolean;
  events: BrainCalendarEvent[];
  source: "google-calendar";
  error?: string;
}

export function summarizeCalendarContext(
  context: BrainCalendarContext,
): string {
  const lines = [
    `Agenda disponible : ${context.available ? "oui" : "non"}.`,
  ];

  if (context.error) {
    lines.push(`Erreur : ${context.error}`);
  }

  if (context.events.length === 0) {
    lines.push("Aucun événement prévu.");
    return lines.join("\n");
  }

  lines.push("Événements :");

  for (const event of context.events) {
    lines.push(
      [
        `- ${event.title}`,
        event.start ? `début: ${event.start}` : "",
        event.end ? `fin: ${event.end}` : "",
        event.location ? `lieu: ${event.location}` : "",
        event.description ? `description: ${event.description}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  return lines.join("\n");
}

export async function buildCalendarContext(
  event: {
    type: string;
    payload?: unknown;
  },
  now: Date,
): Promise<BrainCalendarContext> {

  try {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { listEvents } = await import(
      "@/lib/connectors/google/calendar/list-events"
    );

    const result = await listEvents({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      pageSize: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    return {
      available: true,
      source: "google-calendar",
      events: result.events.map((event) => ({
        id: event.id ?? "",
        title: event.summary ?? "Sans titre",
        start:
          event.start?.dateTime ??
          event.start?.date ??
          undefined,
        end:
          event.end?.dateTime ??
          event.end?.date ??
          undefined,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
      })),
    };
  } catch (error) {
    return {
      available: false,
      source: "google-calendar",
      events: [],
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer l'agenda.",
    };
  }
}
