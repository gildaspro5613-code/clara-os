/**
 * ============================================
 * CLARA OS
 * Publisher Module
 * --------------------------------------------
 * File : publisher-context.ts
 * Responsibility :
 * Defines the complete context
 * required to generate publications.
 * ============================================
 */

import { BrainContext } from "@/lib/brain";
import { ExperienceRecord } from "@/lib/experience/experience-record";
import { Recommendation } from "@/lib/wisdom/recommendation";

/**
 * Publisher context.
 */
export interface PublisherContext {

  /**
   * Current reasoning context.
   */
  brain: BrainContext;

  /**
   * Relevant professional experiences.
   */
  experiences: ExperienceRecord[];

  /**
   * Professional recommendations.
   */
  recommendations: Recommendation[];

  /**
   * Publication language.
   */
  language: string;

  /**
   * Creation date.
   */
  createdAt: Date;

}