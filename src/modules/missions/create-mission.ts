// ============================================
// CLARA OS
// Missions Module
//
// File : create-mission.ts
// Responsibility :
// Create an operational Mission from a Brain execution.
// ============================================

import type { BrainDashboard } from "@/lib/brain/dashboard";
import { missionFromBrain } from "./mission-from-brain";
import type { Mission } from "./types/Mission";

/**
 * Create an operational Mission from a Brain dashboard snapshot.
 *
 * No persistence is performed here.
 */
export function createMissionFromBrain(
  dashboard: BrainDashboard
): Mission {
  return missionFromBrain(dashboard);
}
