/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : experience-record.ts
 * Responsibility :
 * Defines one persistent experience
 * stored by Clara.
 * ============================================
 */

import { Experience } from "./experience";

/**
 * Persistent experience record.
 */
export interface ExperienceRecord {

  /**
   * Experience.
   */
  experience: Experience;

  /**
   * Summary.
   */
  summary: string;

  /**
   * Lessons extracted.
   */
  lessons: string[];

  /**
   * Confidence score.
   */
  confidence: number;

  /**
   * Should become knowledge.
   */
  promoteToKnowledge: boolean;

}