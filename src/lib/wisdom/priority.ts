/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : priority.ts
 * Responsibility :
 * Defines the priority of a
 * professional decision.
 * ============================================
 */

import { Decision } from "./decision";

/**
 * Professional priority.
 */
export interface Priority {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Associated decision.
   */
  decision: Decision;

  /**
   * Priority level.
   */
  level:

    | "low"

    | "medium"

    | "high"

    | "critical";

  /**
   * Priority justification.
   */
  reason: string;

  /**
   * Expected impact.
   */
  impact: string;

  /**
   * Creation date.
   */
  createdAt: Date;

}