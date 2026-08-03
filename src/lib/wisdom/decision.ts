/**
 * ============================================
 * CLARA OS
 * Wisdom Module
 * --------------------------------------------
 * File : decision.ts
 * Responsibility :
 * Defines a professional decision.
 * ============================================
 */

import { Recommendation } from "./recommendation";

/**
 * Professional decision.
 */
export interface Decision {

  /**
   * Unique identifier.
   */
  id: string;

  /**
   * Decision title.
   */
  title: string;

  /**
   * Decision description.
   */
  description: string;

  /**
   * Supporting recommendation.
   */
  recommendation: Recommendation;

  /**
   * Decision status.
   */
  status:

    | "proposed"

    | "approved"

    | "rejected"

    | "executed";

  /**
   * Human validation required.
   */
  requiresApproval: boolean;

  /**
   * Creation date.
   */
  createdAt: Date;

}