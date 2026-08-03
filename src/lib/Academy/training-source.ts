/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : training-source.ts
 * Responsibility :
 * Represents one educational resource used
 * during a training program.
 * ============================================
 */

/**
 * Type of educational source.
 */
export enum TrainingSourceType {

  PDF = "PDF",

  DOCUMENT = "DOCUMENT",

  VIDEO = "VIDEO",

  AUDIO = "AUDIO",

  WEBSITE = "WEBSITE",

  PROCEDURE = "PROCEDURE",

  CONVERSATION = "CONVERSATION",

  EXPERIENCE = "EXPERIENCE",

}

/**
 * One educational resource.
 */
export interface TrainingSource {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Source title.
   */
  title: string;

  /**
   * Source type.
   */
  type: TrainingSourceType;

  /**
   * Original location.
   */
  location: string;

  /**
   * Human author.
   */
  author?: string;

  /**
   * Short description.
   */
  description?: string;

  /**
   * Whether the source
   * has already been studied.
   */
  studied: boolean;

  /**
   * Study completion date.
   */
  studiedAt?: Date;

}