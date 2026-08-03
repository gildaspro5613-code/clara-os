/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : lesson.ts
 * Responsibility :
 * Defines a lesson learned from
 * professional experience.
 * ============================================
 */

/**
 * Lesson learned.
 */
export interface Lesson {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Lesson title.
   */
  title: string;

  /**
   * Description.
   */
  description: string;

  /**
   * Recommendation.
   */
  recommendation: string;

  /**
   * Confidence level.
   */
  confidence: number;

  /**
   * Date of validation.
   */
  validatedAt: Date;

}