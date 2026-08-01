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
 * Build a decision from Clara's understanding.
 */
export function prioritize(
  understanding: Understanding
): Decision {

  const objective: Objective = {
    id: crypto.randomUUID(),
    title: understanding.intent,
    description: understanding.summary,
    priority: 1,
    completed: false,
  };

  return {
    id: crypto.randomUUID(),
    objective,
    summary: understanding.summary,
    priority: DecisionPriority.MEDIUM,
    createdAt: new Date(),
  };
}