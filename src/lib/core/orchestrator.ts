/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : orchestrator.ts
 * Responsibility :
 * Coordinates one complete cognitive cycle
 * between the Core and the Brain.
 * ============================================
 */

import { Event } from "@/types";
import { runBrainDashboard } from "@/lib/brain";

import { ClaraSession } from "./session";

/**
 * Executes one complete Clara reasoning cycle and preserves both the
 * recommendation and the Brain tasks. Execution remains a separate,
 * explicitly gated operational step.
 */
export async function orchestrate(
  session: ClaraSession,
  event: Event,
): Promise<ClaraSession> {
  const dashboard = runBrainDashboard(event);

  session.recommendation = dashboard.recommendation;
  session.tasks = dashboard.tasks;
  session.updatedAt = new Date();

  return session;
}
