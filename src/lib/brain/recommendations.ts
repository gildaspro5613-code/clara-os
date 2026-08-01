/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : recommendations.ts
 * Responsibility :
 * Build a recommendation from a decision.
 * ============================================
 */

import {
  Decision,
  Recommendation,
  RecommendationConfidence,
} from "@/types";

/**
 * Produce a recommendation from a decision.
 */
export function recommend(
  decision: Decision
): Recommendation {
  return {
    id: crypto.randomUUID(),
    decision,
    summary: decision.summary,
    rationale: `Recommendation generated from decision "${decision.summary}".`,
    confidence: RecommendationConfidence.HIGH,
    createdAt: new Date(),
  };
}