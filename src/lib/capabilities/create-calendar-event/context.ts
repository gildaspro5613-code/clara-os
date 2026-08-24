/**
 * ============================================
 * CLARA OS
 * Create Calendar Event Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

export interface CreateCalendarEventContext {

  /**
   * Event title.
   */
  readonly title: string;

  /**
   * Event description.
   */
  readonly description?: string;

  /**
   * Event location.
   */
  readonly location?: string;

  /**
   * Event start.
   */
  readonly start: string;

  /**
   * Event end.
   */
  readonly end: string;

  /**
   * Guest email addresses.
   */
  readonly attendees?: string[];

}
