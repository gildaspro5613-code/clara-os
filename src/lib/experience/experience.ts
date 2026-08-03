/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : experience.ts
 * Responsibility :
 * Defines a professional experience
 * handled by Clara.
 * ============================================
 */

/**
 * Represents one complete professional
 * experience lived by Clara.
 */
export interface Experience {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Experience title.
   */
  title: string;

  /**
   * Experience category.
   *
   * Examples:
   * - incident
   * - success
   * - mission
   * - feedback
   */
  category: string;

  /**
   * Short description.
   */
  description: string;

  /**
   * Creation date.
   */
  createdAt: Date;

  /**
   * Associated tags.
   */
  tags: string[];

}