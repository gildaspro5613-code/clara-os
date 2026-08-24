/**
 * ============================================
 * CLARA OS
 * Update Calendar Event Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

export interface UpdateCalendarEventContext {

  /**
   * Existing Google Calendar event identifier.
   */
  readonly eventId: string;

  /**
   * Updated event title.
   */
  readonly title?: string;

  /**
   * Updated description.
   */
  readonly description?: string;

  /**
   * Updated location.
   */
  readonly location?: string;

  /**
   * Updated event start.
   */
  readonly start?: string;

  /**
   * Updated event end.
   */
  readonly end?: string;

  /**
   * Updated guest email addresses.
   */
  readonly attendees?: string[];

}
