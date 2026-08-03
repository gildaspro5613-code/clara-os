/**
 * Google Calendar context.
 */
export interface GoogleCalendarContext {

  /**
   * Event identifier.
   */
  eventId?: string;

  /**
   * Calendar identifier.
   */
  calendarId?: string;

  /**
   * Event title.
   */
  title: string;

  /**
   * Event description.
   */
  description?: string;

  /**
   * Event location.
   */
  location?: string;

  /**
   * Start date.
   */
  start: Date;

  /**
   * End date.
   */
  end: Date;

  /**
   * Guests.
   */
  attendees?: string[];

}