/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : priorities.ts
 * Responsibility :
 * Transform Clara's understanding into
 * a prioritized decision.
 * ============================================
 */

import {
  Decision,
  DecisionPriority,
  Objective,
  Understanding,
} from "@/types";

/**
 * Determine the operational priority of a situation.
 *
 * This first V1 remains rule-based rather than
 * reducing the three cognitive dimensions to
 * a single numerical score.
 */
function determinePriority(
  understanding: Understanding,
): DecisionPriority {

  const {
    importance,
    urgency,
    impact,
  } = understanding;

  if (
    importance >= 0.8 &&
    urgency >= 0.8 &&
    impact >= 0.8
  ) {
    return DecisionPriority.CRITICAL;
  }

  if (
    urgency >= 0.7 &&
    (importance >= 0.6 || impact >= 0.6)
  ) {
    return DecisionPriority.HIGH;
  }

  if (
    importance < 0.35 &&
    urgency < 0.35 &&
    impact < 0.35
  ) {
    return DecisionPriority.LOW;
  }

  return DecisionPriority.MEDIUM;
}

/**
 * Map the operational priority to the objective
 * priority used by the current Objective model.
 */
function objectivePriority(
  priority: DecisionPriority,
): number {

  switch (priority) {
    case DecisionPriority.CRITICAL:
      return 1;

    case DecisionPriority.HIGH:
      return 2;

    case DecisionPriority.MEDIUM:
      return 3;

    case DecisionPriority.LOW:
    default:
      return 4;
  }
}

/**
 * Build a decision from Clara's understanding.
 */
export function prioritize(
  understanding: Understanding,
): Decision {

  const priority = determinePriority(
    understanding,
  );

  const objective: Objective = {
    id: crypto.randomUUID(),
    title: understanding.intent,
    description: understanding.summary,
    priority: objectivePriority(priority),
    completed: false,
  };

  return {
    id: crypto.randomUUID(),
    missionId: understanding.missionId,
    objective,
    summary: understanding.summary,
    priority,
    actions: understanding.actions,
    nextAction: understanding.nextAction,
    createdAt: new Date(),
  };
}
