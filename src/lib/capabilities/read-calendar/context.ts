/**
 * ============================================
 * CLARA OS
 * Read Calendar Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

export interface ReadCalendarContext {

  /**
   * Optional lower time boundary.
   */
  readonly timeMin?: string;

  /**
   * Optional upper time boundary.
   */
  readonly timeMax?: string;

}
