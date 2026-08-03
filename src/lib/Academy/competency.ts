/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : competency.ts
 * Responsibility :
 * Represents one professional competency
 * acquired and developed by Clara.
 * ============================================
 */

/**
 * Competency mastery level.
 */
export enum CompetencyLevel {

  DISCOVERED = "DISCOVERED",

  LEARNING = "LEARNING",

  OPERATIONAL = "OPERATIONAL",

  ADVANCED = "ADVANCED",

  EXPERT = "EXPERT",

}

/**
 * One professional competency.
 */
export interface Competency {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Competency name.
   */
  name: string;

  /**
   * Functional domain.
   */
  domain: string;

  /**
   * Business description.
   */
  description: string;

  /**
   * Current mastery level.
   */
  level: CompetencyLevel;

  /**
   * Confidence score.
   */
  confidence: number;

  /**
   * Number of successful uses.
   */
  successfulUses: number;

  /**
   * Number of learning experiences.
   */
  learningExperiences: number;

  /**
   * Last time this competency
   * was used.
   */
  lastUsedAt?: Date;

  /**
   * Creation date.
   */
  createdAt: Date;

  /**
   * Last update.
   */
  updatedAt: Date;

}