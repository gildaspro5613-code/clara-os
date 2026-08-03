/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : feedback.ts
 * Responsibility :
 * Defines feedback collected after
 * a professional experience.
 * ============================================
 */

import { Lesson } from "./lesson";

/**
 * Professional feedback.
 */
export interface Feedback {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Feedback source.
   */
  source: string;

  /**
   * Feedback author.
   */
  author: string;

  /**
   * Feedback content.
   */
  message: string;

  /**
   * Satisfaction score.
   */
  rating: number;

  /**
   * Suggested improvements.
   */
  improvements: string[];

  /**
   * Lessons extracted.
   */
  lessons: Lesson[];

  /**
   * Feedback date.
   */
  createdAt: Date;

}