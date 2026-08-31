/**
 * ============================================
 * CLARA OS
 * Google Calendar – List Calendars
 * --------------------------------------------
 * File : list-calendars.ts
 * Responsibility :
 * Lists calendars accessible by the
 * authenticated Google account.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

import { CalendarClient } from "./calendar-client";

/**
 * Options for listing accessible Google calendars.
 */
export interface ListCalendarsOptions {

  /**
   * Maximum number of calendars to return per page.
   */
  pageSize?: number;

  /**
   * Pagination token from a previous call.
   */
  pageToken?: string;

}

/**
 * A page of calendars returned by {@link listCalendars}.
 */
export interface ListCalendarsResult {

  /**
   * Calendar entries visible to the authenticated user.
   */
  calendars: calendar_v3.Schema$CalendarListEntry[];

  /**
   * Token used to request the next page.
   */
  nextPageToken?: string;

}

/**
 * Lists calendars accessible by the authenticated account.
 *
 * Uses {@link CalendarClient} to obtain an authenticated Calendar client and
 * delegates to the Calendar API v3 `calendarList.list` endpoint.
 * Errors thrown by the Google API are propagated unchanged.
 *
 * @param options - Optional pagination parameters.
 * @returns A page of accessible calendars and an optional next-page token.
 */
export async function listCalendars(
  options?: ListCalendarsOptions,
): Promise<ListCalendarsResult> {

  const calendar = await new CalendarClient().create();

  const params: calendar_v3.Params$Resource$Calendarlist$List = {};

  if (options?.pageSize !== undefined) {

    params.maxResults = options.pageSize;

  }

  if (options?.pageToken !== undefined) {

    params.pageToken = options.pageToken;

  }

  const response = await calendar.calendarList.list(params);

  return {

    calendars: response.data.items ?? [],

    nextPageToken: response.data.nextPageToken ?? undefined,

  };

}
