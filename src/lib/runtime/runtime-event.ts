/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : runtime-event.ts
 * Responsibility :
 * Defines an event entering
 * Clara Runtime.
 * ============================================
 */

/**
 * Runtime event.
 */
export interface RuntimeEvent {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Event source.
   */
  source: string;

  /**
   * Event type.
   */
  type: string;

  /**
   * Event payload.
   */
  payload: unknown;

  /**
   * Reception date.
   */
  receivedAt: Date;

}