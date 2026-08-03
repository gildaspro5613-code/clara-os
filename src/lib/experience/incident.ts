/**
 * ============================================
 * CLARA OS
 * Experience Module
 * --------------------------------------------
 * File : incident.ts
 * Responsibility :
 * Defines an incident encountered
 * during a professional experience.
 * ============================================
 */

import { Lesson } from "./lesson";

/**
 * Professional incident.
 */
export interface Incident {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Incident title.
   */
  title: string;

  /**
   * Description.
   */
  description: string;

  /**
   * Severity level.
   */
  severity:

    | "low"

    | "medium"

    | "high"

    | "critical";

  /**
   * Root cause.
   */
  rootCause: string;

  /**
   * Resolution.
   */
  resolution: string;

  /**
   * Lessons learned.
   */
  lessons: Lesson[];

  /**
   * Incident date.
   */
  occurredAt: Date;

}