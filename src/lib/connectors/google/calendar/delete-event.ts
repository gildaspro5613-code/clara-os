/**
 * ============================================
 * CLARA OS
 * Google Calendar – Delete Event
 * --------------------------------------------
 * File : delete-event.ts
 * Responsibility :
 * Deletes an event from a Google
 * Calendar via CalendarClient.
 * ============================================
 */

import { CalendarClient } from "./calendar-client";

const DEFAULT_CALENDAR_ID = "primary";

/**
 * Options for deleting a Google Calendar event.
 */
export interface DeleteEventOptions {

  /**
   * Calendar identifier. Defaults to `primary` when omitted.
   */
  calendarId?: string;

  /**
   * Unique identifier of the event to delete.
   */
  eventId: string;

  /**
   * Guest notification strategy.
   */
  sendUpdates?: "all" | "externalOnly" | "none";

}

/**
 * Deletes an event from a Google Calendar.
 *
 * Uses {@link CalendarClient} to obtain an authenticated Calendar client and
 * delegates to the Calendar API v3 `events.delete` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Calendar and event identifiers.
 * @returns Resolves when the event has been deleted.
 * @throws {Error} When `eventId` is empty or blank.
 */
export async function deleteEvent(
  options: DeleteEventOptions,
): Promise<void> {

  if (!options.eventId.trim()) {

    throw new Error("deleteEvent: eventId must not be empty.");

  }

  const calendar = await new CalendarClient().create();

  await calendar.events.delete({

    calendarId: options.calendarId ?? DEFAULT_CALENDAR_ID,

    eventId: options.eventId,

    sendUpdates: options.sendUpdates,

  });

}
