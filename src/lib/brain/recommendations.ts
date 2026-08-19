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
  DecisionPriority,
  Recommendation,
  RecommendationConfidence,
} from "@/types";

/**
 * Produce a recommendation from a decision.
 */
export function recommend(
  decision: Decision
): Recommendation {
  const nextAction = decision.nextAction?.trim();

  const priorityLabel = {
    [DecisionPriority.LOW]: "faible",
    [DecisionPriority.MEDIUM]: "moyenne",
    [DecisionPriority.HIGH]: "haute",
    [DecisionPriority.CRITICAL]: "critique",
  }[decision.priority];

  const summary = nextAction
    ? `Priorité ${priorityLabel}. Commencer par : ${nextAction}`
    : decision.summary;

  const rationale = decision.actions.length > 1
    ? `La décision est classée en priorité ${priorityLabel} et comporte ${decision.actions.length} actions planifiées.`
    : `La décision est classée en priorité ${priorityLabel}.`;

  return {
    id: crypto.randomUUID(),
    decision,
    summary,
    rationale,
    confidence: RecommendationConfidence.HIGH,
    createdAt: new Date(),
  };
}