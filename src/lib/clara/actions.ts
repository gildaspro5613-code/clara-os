/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : actions.ts
 * Responsibility :
 * Builds Clara's suggested actions from
 * the current recommendation.
 * ============================================
 */

import { Recommendation } from "@/types";

/**
 * Returns Clara's suggested actions.
 */
export function getActions(
  recommendation: Recommendation,
): string[] {

  return [
    recommendation.summary,
  ];

}