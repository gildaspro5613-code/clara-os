/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : template.ts
 * Responsibility :
 * Defines a publication template.
 * ============================================
 */

/**
 * Publication template.
 */
export interface Template {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Template name.
   */
  name: string;

  /**
   * Template description.
   */
  description: string;

  /**
   * Template category.
   */
  category: string;

  /**
   * Template version.
   */
  version: string;

  /**
   * Supported output formats.
   */
  outputs: string[];

}