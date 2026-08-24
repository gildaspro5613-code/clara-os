/**
 * ============================================
 * CLARA OS
 * Delete Calendar Event Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface DeleteCalendarEventResult {

  readonly success: boolean;

  readonly eventId: string;

  readonly message: string;

  readonly completedAt: Date;

}
