import { loadMissions } from "./mission-store";
import { orchestrateMissions } from "./mission-orchestrator";
import type { Mission } from "./types/Mission";

/**
 * Resolves the operational mission shared by Clara OS surfaces.
 * Durable clara_missions persistence is the source of truth.
 */
export async function getCurrentMission(): Promise<Mission | null> {
  try {
    return orchestrateMissions(await loadMissions()).current;
  } catch {
    return null;
  }
}
