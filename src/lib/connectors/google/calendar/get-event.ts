/**
 * ============================================
 * CLARA OS
 * Google Calendar – Get Event
 * --------------------------------------------
 * File : get-event.ts
 * Responsibility :
 * Retrieves one event from a Google
 * Calendar by its identifier.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

import { CalendarClient } from "./calendar-client";

const DEFAULT_CALENDAR_ID = "primary";

/**
 * Options for retrieving a Google Calendar event.
 */
export interface GetEventOptions {

  /**
   * Calendar identifier. Defaults to `primary` when omitted.
   */
  calendarId?: string;

  /**
   * Unique identifier of the event to retrieve.
   */
  eventId: string;

}

/**
 * Retrieves an event from a Google Calendar.
 *
 * Uses {@link CalendarClient} to obtain an authenticated Calendar client and
 * delegates to the Calendar API v3 `events.get` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Calendar and event identifiers.
 * @returns The requested Google Calendar event.
 * @throws {Error} When `eventId` is empty or blank.
 */
export async function getEvent(
  options: GetEventOptions,
): Promise<calendar_v3.Schema$Event> {

  if (!options.eventId.trim()) {

    throw new Error("getEvent: eventId must not be empty.");

  }

  const calendar = new CalendarClient().create();

  const response = await calendar.events.get({

    calendarId: options.calendarId ?? DEFAULT_CALENDAR_ID,

    eventId: options.eventId,

  });

  return response.data;

}
