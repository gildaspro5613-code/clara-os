/**
 * ============================================
 * CLARA OS
 * Microsoft Calendar – Create Event
 * --------------------------------------------
 * Responsibility :
 * Creates a calendar event through Microsoft Graph.
 * ============================================
 */

import { MicrosoftGraphClient } from "../graph/graph-client";

export interface MicrosoftDateTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface MicrosoftEventAttendee {
  address: string;
  name?: string;
  type?: "required" | "optional" | "resource";
}

export interface CreateMicrosoftEventOptions {
  subject: string;
  start: MicrosoftDateTimeZone;
  end: MicrosoftDateTimeZone;
  body?: string;
  bodyType?: "Text" | "HTML";
  location?: string;
  attendees?: MicrosoftEventAttendee[];
}

export interface MicrosoftCreatedEvent {
  id?: string;
  subject?: string;
  webLink?: string;
  [key: string]: unknown;
}

export async function createMicrosoftEvent(
  options: CreateMicrosoftEventOptions,
): Promise<MicrosoftCreatedEvent> {
  const client = new MicrosoftGraphClient();

  return client.request<MicrosoftCreatedEvent>("/me/events", {
    method: "POST",
    body: JSON.stringify({
      subject: options.subject,
      start: options.start,
      end: options.end,
      ...(options.body
        ? {
            body: {
              contentType: options.bodyType ?? "Text",
              content: options.body,
            },
          }
        : {}),
      ...(options.location
        ? { location: { displayName: options.location } }
        : {}),
      ...(options.attendees
        ? {
            attendees: options.attendees.map((attendee) => ({
              emailAddress: {
                address: attendee.address,
                ...(attendee.name ? { name: attendee.name } : {}),
              },
              type: attendee.type ?? "required",
            })),
          }
        : {}),
    }),
  });
}
