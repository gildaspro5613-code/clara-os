/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : wisdom-context.ts
 * Responsibility :
 * Defines the context required
 * for professional judgment.
 * ============================================
 */

import { BrainContext } from "@/lib/brain";
import { Understanding } from "@/types";
import { ExperienceRecord } from "@/lib/experience/experience-record";
import { Recommendation } from "./recommendation";

/**
 * Wisdom context.
 */
export interface WisdomContext {

  /**
   * Current reasoning context.
   */
  brain: BrainContext;

  /**
   * Current Brain understanding.
   */
  understanding: Understanding;

  /**
   * Previous professional experiences.
   */
  experiences: ExperienceRecord[];

  /**
   * Existing recommendations.
   */
  recommendations: Recommendation[];

  /**
   * Evaluation date.
   */
  evaluatedAt: Date;

}