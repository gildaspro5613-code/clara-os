/**
 * ============================================
 * CLARA OS
 * Installation Module
 * --------------------------------------------
 * File : installation-event.ts
 * Responsibility :
 * Defines installation lifecycle events.
 * ============================================
 */

 /**
  * Installation event.
  */
export interface InstallationEvent {

  /**
   * Event identifier.
   */
  id: string;

  /**
   * Event type.
   */
  type: string;

  /**
   * Event message.
   */
  message: string;

  /**
   * Event date.
   */
  createdAt: Date;

}