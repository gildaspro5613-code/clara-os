/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : document-template.ts
 * Responsibility :
 * Defines one business document template.
 * ============================================
 */

/**
 * Document template.
 */
export interface DocumentTemplate {

  /**
   * Template identifier.
   */
  id: string;

  /**
   * Template name.
   */
  name: string;

  /**
   * Short description.
   */
  description: string;

  /**
   * Is template available.
   */
  enabled: boolean;

}