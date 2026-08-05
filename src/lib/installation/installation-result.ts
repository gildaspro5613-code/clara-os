/**
 * ============================================
 * CLARA OS
 * Installation Module
 * --------------------------------------------
 * File : installation-result.ts
 * Responsibility :
 * Defines the result returned
 * after an installation.
 * ============================================
 */

 /**
  * Installation result.
  */
export interface InstallationResult {

  /**
   * Installation succeeded.
   */
  success: boolean;

  /**
   * Result message.
   */
  message: string;

  /**
   * Installed component.
   */
  target: string;

  /**
   * Completion date.
   */
  completedAt: Date;

}