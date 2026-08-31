/**
 * ============================================
 * CLARA OS
 * Google Calendar – List Events
 * --------------------------------------------
 * File : list-events.ts
 * Responsibility :
 * Lists events from a Google Calendar
 * using CalendarClient.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

import { CalendarClient } from "./calendar-client";

const DEFAULT_CALENDAR_ID = "primary";

/**
 * Options for listing events from a Google Calendar.
 */
export interface ListEventsOptions {

  /**
   * Calendar identifier. Defaults to `primary` when omitted.
   */
  calendarId?: string;

  /**
   * Maximum number of events to return.
   */
  pageSize?: number;

  /**
   * Lower time boundary (inclusive), RFC 3339 timestamp.
   */
  timeMin?: string;

  /**
   * Upper time boundary (exclusive), RFC 3339 timestamp.
   */
  timeMax?: string;

  /**
   * Pagination token from a previous call.
   */
  pageToken?: string;

  /**
   * Whether to expand recurring events into instances.
   */
  singleEvents?: boolean;

  /**
   * Event ordering strategy.
   */
  orderBy?: "startTime" | "updated";

}

/**
 * A page of Google Calendar events.
 */
export interface ListEventsResult {

  /**
   * Matching events for the request.
   */
  events: calendar_v3.Schema$Event[];

  /**
   * Token used to request the next page.
   */
  nextPageToken?: string;

}

/**
 * Lists events from a Google Calendar.
 *
 * Uses {@link CalendarClient} to obtain an authenticated Calendar client and
 * delegates to the Calendar API v3 `events.list` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Optional filters and pagination controls.
 * @returns A page of events and an optional continuation token.
 */
export async function listEvents(
  options?: ListEventsOptions,
): Promise<ListEventsResult> {

  const calendar = await new CalendarClient().create();

  const params: calendar_v3.Params$Resource$Events$List = {

    calendarId: options?.calendarId ?? DEFAULT_CALENDAR_ID,

  };

  if (options?.pageSize !== undefined) {

    params.maxResults = options.pageSize;

  }

  if (options?.timeMin !== undefined) {

    params.timeMin = options.timeMin;

  }

  if (options?.timeMax !== undefined) {

    params.timeMax = options.timeMax;

  }

  if (options?.pageToken !== undefined) {

    params.pageToken = options.pageToken;

  }

  if (options?.singleEvents !== undefined) {

    params.singleEvents = options.singleEvents;

  }

  if (options?.orderBy !== undefined) {

    params.orderBy = options.orderBy;

  }

  const response = await calendar.events.list(params);

  return {

    events: response.data.items ?? [],

    nextPageToken: response.data.nextPageToken ?? undefined,

  };

}
