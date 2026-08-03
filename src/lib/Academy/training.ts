/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : training.ts
 * Responsibility :
 * Represents one complete training program
 * followed by Clara.
 * ============================================
 */

/**
 * Training status.
 */
export enum TrainingStatus {

  PLANNED = "PLANNED",

  IN_PROGRESS = "IN_PROGRESS",

  COMPLETED = "COMPLETED",

  ARCHIVED = "ARCHIVED",

}

/**
 * Training level.
 */
export enum TrainingLevel {

  FOUNDATION = "FOUNDATION",

  BEGINNER = "BEGINNER",

  INTERMEDIATE = "INTERMEDIATE",

  ADVANCED = "ADVANCED",

  EXPERT = "EXPERT",

}

/**
 * One training followed by Clara.
 */
export interface Training {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Training title.
   */
  title: string;

  /**
   * Short description.
   */
  description: string;

  /**
   * Functional domain.
   */
  domain: string;

  /**
   * Training level.
   */
  level: TrainingLevel;

  /**
   * Current status.
   */
  status: TrainingStatus;

  /**
   * Training objectives.
   */
  objectives: string[];

  /**
   * Source documents.
   */
  sources: string[];

  /**
   * Training creator.
   */
  instructor: string;

  /**
   * Creation date.
   */
  createdAt: Date;

  /**
   * Last update.
   */
  updatedAt: Date;

}