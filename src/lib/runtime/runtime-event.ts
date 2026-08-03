/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : runtime-event.ts
 * Responsibility :
 * Defines an execution request
 * entering Clara Runtime.
 * ============================================
 */

/**
 * Runtime event.
 */
export interface RuntimeEvent {

  /**
   * Unique identifier.
   */
  readonly id: string;

  /**
   * Event source.
   */
  readonly source: string;

  /**
   * Capability to execute.
   */
  readonly capabilityId: string;

  /**
   * Capability execution context.
   */
  readonly context: unknown;

  /**
   * Reception date.
   */
  readonly receivedAt: Date;

}