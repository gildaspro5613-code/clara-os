/**
 * ============================================
 * CLARA OS
 * Google Calendar – Create Event
 * --------------------------------------------
 * File : create-event.ts
 * Responsibility :
 * Creates a new event in a Google
 * Calendar via CalendarClient.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

import { CalendarClient } from "./calendar-client";

const DEFAULT_CALENDAR_ID = "primary";

/**
 * Options for creating a Google Calendar event.
 */
export interface CreateEventOptions {

  /**
   * Calendar identifier. Defaults to `primary` when omitted.
   */
  calendarId?: string;

  /**
   * Event payload to create.
   */
  event: calendar_v3.Schema$Event;

  /**
   * Guest notification strategy.
   */
  sendUpdates?: "all" | "externalOnly" | "none";

}

/**
 * Creates a new event in a Google Calendar.
 *
 * Uses {@link CalendarClient} to obtain an authenticated Calendar client and
 * delegates to the Calendar API v3 `events.insert` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Calendar identifier and event payload.
 * @returns The created Google Calendar event.
 */
export async function createEvent(
  options: CreateEventOptions,
): Promise<calendar_v3.Schema$Event> {

  const calendar = await new CalendarClient().create();

  const response = await calendar.events.insert({

    calendarId: options.calendarId ?? DEFAULT_CALENDAR_ID,

    requestBody: options.event,

    sendUpdates: options.sendUpdates,

  });

  return response.data;

}
