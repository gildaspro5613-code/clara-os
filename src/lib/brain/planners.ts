/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : planners.ts
 * Responsibility :
 * Build an execution plan from a decision.
 * ============================================
 */

import {
  Decision,
  Task,
  TaskStatus,
} from "@/types";

/**
 * Create the execution plan associated with
 * a decision.
 */
export function plan(decision: Decision): Task[] {
  const actions = decision.actions
    .map((action) => action.trim())
    .filter(Boolean);

  if (actions.length === 0) {
    const action = decision.nextAction?.trim();

    return [
      {
        id: crypto.randomUUID(),
        decision,
        title: action || decision.summary,
        description: action
          ? `Action décidée : ${action}`
          : `Execute decision: ${decision.summary}`,
        status: TaskStatus.TODO,
        createdAt: new Date(),
      },
    ];
  }

  return actions.map((action) => ({
    id: crypto.randomUUID(),
    decision,
    title: action,
    description: `Action décidée : ${action}`,
    status: TaskStatus.TODO,
    createdAt: new Date(),
  }));
}