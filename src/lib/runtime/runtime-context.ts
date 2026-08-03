/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : runtime-context.ts
 * Responsibility :
 * Defines the complete runtime
 * context required by Clara.
 * ============================================
 */

import { BrainContext } from "@/lib/brain";
import { ExperienceRecord } from "@/lib/experience/experience-record";
import { Recommendation } from "@/lib/wisdom/recommendation";

/**
 * Runtime context.
 */
export interface RuntimeContext {

  /**
   * Current reasoning context.
   */
  brain: BrainContext;

  /**
   * Professional experiences.
   */
  experiences: ExperienceRecord[];

  /**
   * Current recommendations.
   */
  recommendations: Recommendation[];

  /**
   * Runtime creation date.
   */
  createdAt: Date;

}