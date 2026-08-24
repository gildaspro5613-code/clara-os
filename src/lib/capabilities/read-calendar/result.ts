/**
 * ============================================
 * CLARA OS
 * Read Calendar Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

import type { calendar_v3 } from "googleapis";

export interface ReadCalendarResult {

  readonly success: boolean;

  readonly calendarId: string;

  readonly events: calendar_v3.Schema$Event[];

  readonly affectedEvents: number;

  readonly message: string;

  readonly completedAt: Date;

}
