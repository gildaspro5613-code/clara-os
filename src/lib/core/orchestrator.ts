/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : orchestrator.ts
 * Responsibility :
 * Coordinates one complete execution cycle
 * between the Core and the Brain.
 * ============================================
 */

import { Event } from "@/types";

import { runBrainDashboard } from "@/lib/brain";
import { missionFromBrain } from "@/modules/missions";

import {
  ClaraSession,
} from "./session";

/**
 * Executes one complete Clara reasoning cycle.
 */
export async function orchestrate(
  session: ClaraSession,
  event: Event,
): Promise<ClaraSession> {

  /*
   * Execute one Brain cycle.
   */
  const dashboard = await runBrainDashboard(
    event,
    session.mission ?? undefined,
  );
  const recommendation = dashboard.recommendation;
  const mission = missionFromBrain(
    dashboard,
    session.mission ?? undefined,
  );

  /*
   * Update the current session.
   */
  session.recommendation = recommendation;
  session.mission = mission;
  session.sources = dashboard.sources;
  session.updatedAt = new Date();

  return session;

}