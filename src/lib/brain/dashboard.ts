/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : dashboard.ts
 * Responsibility :
 * Builds the Brain Dashboard from the
 * current reasoning cycle.
 * ============================================
 */

import type { Priority } from "./priorities";
import type { MissionPlan } from "./planners";
import type { Recommendation } from "./recommendations";

export interface Dashboard {
  priorities: Priority[];
  missions: MissionPlan[];
  recommendations: Recommendation[];

  summary: DashboardSummary;

  generatedAt: Date;
  brainVersion: string;
}

export interface DashboardSummary {
  totalPriorities: number;

  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Builds the dashboard displayed by Clara OS.
 */
export async function buildDashboard(
  priorities: Priority[],
  missions: MissionPlan[],
  recommendations: Recommendation[]
): Promise<Dashboard> {
  const summary: DashboardSummary = {
    totalPriorities: priorities.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const priority of priorities) {
    switch (priority.level) {
      case "critical":
        summary.critical++;
        break;

      case "high":
        summary.high++;
        break;

      case "medium":
        summary.medium++;
        break;

      case "low":
        summary.low++;
        break;
    }
  }

  return Object.freeze({
    priorities,
    missions,
    recommendations,

    summary: Object.freeze(summary),

    generatedAt: new Date(),

    brainVersion: "0.3.0",
  });
}