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
  return [
    {
      id: crypto.randomUUID(),
      decision,
      title: decision.summary,
      description: `Execute decision: ${decision.summary}`,
      status: TaskStatus.TODO,
      createdAt: new Date(),
    },
  ];
}