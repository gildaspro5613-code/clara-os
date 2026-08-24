/**
 * ============================================
 * CLARA OS
 * Workspace Calendar
 * --------------------------------------------
 * Represents one real Google Calendar
 * created during workspace installation.
 * ============================================
 */

export interface WorkspaceCalendar {

  /**
   * Calendar display name.
   */
  name: string;

  /**
   * Google Calendar identifier.
   */
  calendarId: string;

}
