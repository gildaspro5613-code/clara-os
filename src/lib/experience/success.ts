/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : success.ts
 * Responsibility :
 * Defines a successful professional
 * experience.
 * ============================================
 */

import { Lesson } from "./lesson";

/**
 * Successful professional experience.
 */
export interface Success {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Success title.
   */
  title: string;

  /**
   * Description.
   */
  description: string;

  /**
   * Success factors.
   */
  successFactors: string[];

  /**
   * Measured outcomes.
   */
  outcomes: string[];

  /**
   * Lessons learned.
   */
  lessons: Lesson[];

  /**
   * Validation date.
   */
  achievedAt: Date;

}