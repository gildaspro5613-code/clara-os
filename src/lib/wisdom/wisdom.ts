/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : wisdom.ts
 * Responsibility :
 * Defines Clara's professional wisdom.
 * ============================================
 */

/**
 * Professional wisdom.
 */
export interface Wisdom {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Situation.
   */
  situation: string;

  /**
   * Recommendation.
   */
  recommendation: string;

  /**
   * Confidence level.
   */
  confidence: number;

  /**
   * Supporting reasons.
   */
  reasons: string[];

  /**
   * Creation date.
   */
  createdAt: Date;

}