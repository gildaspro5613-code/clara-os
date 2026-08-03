/**
 * Google Calendar result.
 */
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