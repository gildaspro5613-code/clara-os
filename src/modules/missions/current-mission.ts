import { loadMissions } from "./mission-store";
import type { Mission } from "./types/Mission";

/**
 * Resolves the operational mission shared by Clara OS surfaces.
 * Durable clara_missions persistence is the source of truth.
 */
export async function getCurrentMission(): Promise<Mission | null> {
  try {
    const missions = await loadMissions();

    return (
      missions.find((mission) => mission.status === "active") ??
      missions.find((mission) => mission.status === "blocked") ??
      missions.find((mission) => mission.status === "planned") ??
      null
    );
  } catch {
    return null;
  }
}
