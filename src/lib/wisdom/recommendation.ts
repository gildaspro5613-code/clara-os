/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : recommendation.ts
 * Responsibility :
 * Defines a professional
 * recommendation.
 * ============================================
 */

export interface Recommendation {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Recommendation title.
   */
  title: string;

  /**
   * Recommendation.
   */
  description: string;

  /**
   * Expected benefits.
   */
  benefits: string[];

  /**
   * Possible risks.
   */
  risks: string[];

  /**
   * Confidence score.
   */
  confidence: number;

}