/**
 * ============================================
 * CLARA OS
 * Create Calendar Event Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface CreateCalendarEventResult {

  readonly success: boolean;

  readonly eventId: string;

  readonly calendarId: string;

  readonly eventUrl?: string;

  readonly message: string;

  readonly completedAt: Date;

}
