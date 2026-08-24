/**
 * Google Calendar result.
 */

import type { calendar_v3 } from "googleapis";

export interface GoogleCalendarResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Event identifier.
   */
  eventId: string;

  /**
   * Calendar events.
   */
  events?: calendar_v3.Schema$Event[];

  /**
   * Event URL.
   */
  url?: string;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}
