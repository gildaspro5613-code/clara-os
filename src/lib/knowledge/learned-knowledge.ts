/**
 * ============================================
 * CLARA OS
 * Knowledge Engine
 * --------------------------------------------
 * File : learned-knowledge.ts
 * Responsibility :
 * Defines knowledge learned from
 * Clara's professional experience.
 * ============================================
 */

export interface LearnedKnowledge {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Knowledge title.
   */
  title: string;

  /**
   * Knowledge description.
   */
  description: string;

  /**
   * Recommended action.
   */
  recommendation: string;

  /**
   * Confidence score.
   */
  confidence: number;

  /**
   * Experience that produced this knowledge.
   */
  sourceExperienceId: string;

  /**
   * Creation date.
   */
  createdAt: Date;

}
