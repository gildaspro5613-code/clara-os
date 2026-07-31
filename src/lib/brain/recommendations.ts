/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : recommendations.ts
 * Responsibility :
 * Generates Clara's recommendations from
 * mission plans.
 * ============================================
 */

import type { MissionPlan } from "./planners";

export type RecommendationType =
  | "action"
  | "validation"
  | "information"
  | "warning";

export interface Recommendation {
  id: string;

  type: RecommendationType;

  title: string;

  message: string;

  confidence: number;

  missionId: string;

  createdAt: Date;
}

/**
 * Generates recommendations from mission plans.
 */
export async function recommend(
  plans: readonly MissionPlan[]
): Promise<readonly Recommendation[]> {
  return Object.freeze(plans.map(createRecommendation));
}

/**
 * Creates a recommendation from one mission plan.
 */
function createRecommendation(
  plan: MissionPlan
): Recommendation {
  return Object.freeze({
    id: crypto.randomUUID(),

    type: getRecommendationType(plan),

    title: plan.title,

    message: buildMessage(plan),

    confidence: calculateConfidence(plan),

    missionId: plan.id,

    createdAt: new Date(),
  });
}

/**
 * Determines the recommendation type.
 */
function getRecommendationType(
  plan: MissionPlan
): RecommendationType {
  switch (plan.priority.level) {
    case "critical":
      return "action";

    case "high":
      return "validation";

    case "medium":
      return "information";

    case "low":
      return "warning";

    default:
      return "information";
  }
}

/**
 * Builds the recommendation message.
 */
function buildMessage(
  plan: MissionPlan
): string {
  switch (plan.priority.level) {
    case "critical":
      return `Je recommande de traiter immédiatement : ${plan.title}.`;

    case "high":
      return `Je recommande de valider cette mission avant son exécution.`;

    case "medium":
      return `Cette mission peut être planifiée prochainement.`;

    case "low":
      return `Cette mission peut être reportée sans impact immédiat.`;

    default:
      return plan.title;
  }
}

/**
 * Calculates the confidence score.
 */
function calculateConfidence(
  plan: MissionPlan
): number {
  return Math.max(0, Math.min(100, plan.priority.score));
}