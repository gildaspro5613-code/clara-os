/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : application.ts
 * Responsibility :
 * Defines one Clara application.
 * ============================================
 */

/**
 * One Clara application.
 */
export interface Application {

  /**
   * Unique application identifier.
   */
  id: string;

  /**
   * Public application name.
   */
  name: string;

  /**
   * Short description.
   */
  description: string;

  /**
   * Current version.
   */
  version: string;

  /**
   * Is application enabled.
   */
  enabled: boolean;

}