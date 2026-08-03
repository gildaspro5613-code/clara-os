/**
 * ============================================
 * CLARA OS
 * Templates Module
 * --------------------------------------------
 * File : publication-template.ts
 * Responsibility :
 * Defines the base contract for all
 * publication templates.
 * ============================================
 */

/**
 * Base publication template.
 */
export interface PublicationTemplate {

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
   * Intended audience.
   */
  audience: string;

  /**
   * Publication objective.
   */
  objective: string;

  /**
   * Supported outputs.
   */
  outputs: string[];

  /**
   * Template version.
   */
  version: string;

}