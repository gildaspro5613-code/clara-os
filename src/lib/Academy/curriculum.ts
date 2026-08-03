/**
 * ============================================
 * CLARA OS
 * Academy Module
 * --------------------------------------------
 * File : curriculum.ts
 * Responsibility :
 * Represents one complete learning path
 * for Clara.
 * ============================================
 */

import { Training } from "./training";

/**
 * Curriculum status.
 */
export enum CurriculumStatus {

  PLANNED = "PLANNED",

  IN_PROGRESS = "IN_PROGRESS",

  COMPLETED = "COMPLETED",

  ARCHIVED = "ARCHIVED",

}

/**
 * One learning curriculum.
 */
export interface Curriculum {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Curriculum title.
   */
  title: string;

  /**
   * Business domain.
   */
  domain: string;

  /**
   * Curriculum description.
   */
  description: string;

  /**
   * Expected competencies.
   */
  objectives: string[];

  /**
   * Included trainings.
   */
  trainings: Training[];

  /**
   * Current progress.
   * Value between 0 and 100.
   */
  progress: number;

  /**
   * Current status.
   */
  status: CurriculumStatus;

  /**
   * Curriculum creation date.
   */
  createdAt: Date;

  /**
   * Last update.
   */
  updatedAt: Date;

}