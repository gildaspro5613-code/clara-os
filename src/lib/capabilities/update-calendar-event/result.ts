/**
 * ============================================
 * CLARA OS
 * Update Calendar Event Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface UpdateCalendarEventResult {

  readonly success: boolean;

  readonly eventId: string;

  readonly calendarId: string;

  readonly eventUrl?: string;

  readonly message: string;

  readonly completedAt: Date;

}
