/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : timeline.ts
 * Responsibility :
 * Defines Clara's chronological
 * experience history.
 * ============================================
 */

import { ExperienceRecord } from "./experience-record";

/**
 * Experience timeline.
 */
export interface Timeline {

  /**
   * Timeline identifier.
   */
  id: string;

  /**
   * Timeline name.
   */
  name: string;

  /**
   * Chronological experiences.
   */
  records: ExperienceRecord[];

  /**
   * Creation date.
   */
  createdAt: Date;

  /**
   * Last update.
   */
  updatedAt: Date;

}