/**
 * ============================================
 * CLARA OS
 * Google Calendar – Update Event
 * --------------------------------------------
 * File : update-event.ts
 * Responsibility :
 * Updates an existing event in a
 * Google Calendar via CalendarClient.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

import { CalendarClient } from "./calendar-client";

const DEFAULT_CALENDAR_ID = "primary";

/**
 * Options for updating an existing Google Calendar event.
 */
export interface UpdateEventOptions {

  /**
   * Calendar identifier. Defaults to `primary` when omitted.
   */
  calendarId?: string;

  /**
   * Unique identifier of the event to update.
   */
  eventId: string;

  /**
   * Event fields to patch.
   */
  event: calendar_v3.Schema$Event;

  /**
   * Guest notification strategy.
   */
  sendUpdates?: "all" | "externalOnly" | "none";

}

/**
 * Updates an existing event in a Google Calendar.
 *
 * Uses {@link CalendarClient} to obtain an authenticated Calendar client and
 * delegates to the Calendar API v3 `events.patch` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Calendar and event identifiers with patch payload.
 * @returns The updated Google Calendar event.
 * @throws {Error} When `eventId` is empty or blank.
 */
export async function updateEvent(
  options: UpdateEventOptions,
): Promise<calendar_v3.Schema$Event> {

  if (!options.eventId.trim()) {

    throw new Error("updateEvent: eventId must not be empty.");

  }

  const calendar = await new CalendarClient().create();

  const response = await calendar.events.patch({

    calendarId: options.calendarId ?? DEFAULT_CALENDAR_ID,

    eventId: options.eventId,

    requestBody: options.event,

    sendUpdates: options.sendUpdates,

  });

  return response.data;

}
