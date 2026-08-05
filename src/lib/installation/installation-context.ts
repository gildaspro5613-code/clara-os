/**
 * ============================================
 * CLARA OS
 * Installation Module
 * --------------------------------------------
 * File : installation-context.ts
 * Responsibility :
 * Defines the runtime context used
 * during an installation process.
 * ============================================
 */

 /**
  * Installation context.
  */
export interface InstallationContext {

  /**
   * Installation identifier.
   */
  installationId: string;

  /**
   * Target component.
   */
  target: string;

  /**
   * Installation parameters.
   */
  parameters: Record<string, unknown>;

  /**
   * Creation date.
   */
  createdAt: Date;

}