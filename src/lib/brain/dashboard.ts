/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : dashboard.ts
 * Responsibility :
 * Build a dashboard view of the current
 * Brain execution.
 * ============================================
 */

import {
  Context,
  Memory,
  Understanding,
  Decision,
  Task,
  Recommendation,
} from "@/types";

export interface BrainDashboard {
  context: Context;
  memory: Memory;
  understanding: Understanding;
  decision: Decision;
  tasks: Task[];
  recommendation: Recommendation;
  generatedAt: Date;
}

/**
 * Build a dashboard snapshot of the current
 * Brain execution.
 */
export function buildDashboard(
  context: Context,
  memory: Memory,
  understanding: Understanding,
  decision: Decision,
  tasks: Task[],
  recommendation: Recommendation
): BrainDashboard {
  return {
    context,
    memory,
    understanding,
    decision,
    tasks,
    recommendation,
    generatedAt: new Date(),
  };
}