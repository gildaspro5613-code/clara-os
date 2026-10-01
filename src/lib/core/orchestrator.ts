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
import { acquisitionLocale } from "@/lib/brain/acquisition-event";
import { saveAcquisitionRecord } from "@/lib/acquisition/acquisition-store";

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

  const activeMission =
    session.mission &&
    session.mission.status !== "completed" &&
    session.mission.status !== "cancelled"
      ? session.mission
      : undefined;

  const dashboard = await runBrainDashboard(
    event,
    activeMission,
    acquisitionLocale(event),
  );
  const recommendation = dashboard.recommendation;
  const mission = missionFromBrain(
    dashboard,
    activeMission,
  );

  session.recommendation = recommendation;
  session.mission = mission;

  await saveMission(mission);

  if (
    dashboard.acquisition &&
    dashboard.acquisitionDecisionBrief &&
    dashboard.acquisitionLifecycle
  ) {
    const workspaceId = event.context?.workspaceId?.trim();
    if (!workspaceId) {
      throw new Error("Acquisition events require a trusted workspace context.");
    }

    await saveAcquisitionRecord({
      workspaceId,
      qualification: dashboard.acquisition,
      decisionBrief: dashboard.acquisitionDecisionBrief,
      lifecycle: dashboard.acquisitionLifecycle,
      preserveLifecycle: true,
    });
  }

  session.sources = dashboard.sources;
  session.updatedAt = new Date();

  return session;

}