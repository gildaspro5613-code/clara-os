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
import { saveMission } from "@/modules/missions/mission-store";

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
  const activeMission =
    session.mission &&
    session.mission.status !== "completed" &&
    session.mission.status !== "cancelled"
      ? session.mission
      : undefined;

  const dashboard = await runBrainDashboard(
    event,
    activeMission,
  );
  const recommendation = dashboard.recommendation;
  const mission = missionFromBrain(
    dashboard,
    activeMission,
  );

  /*
   * Update the current session.
   */
  session.recommendation = recommendation;
  session.mission = mission;

  await saveMission(mission);

  session.sources = dashboard.sources;
  session.updatedAt = new Date();

  return session;

}