// ============================================
// CLARA OS
// Missions Module
//
// File : mission-resolver.ts
// Responsibility :
// Resolve whether a conversational turn belongs to an existing mission.
// The resolver never creates a mission implicitly.
// ============================================

import { PostgresMissionRepository } from "./postgres-mission-repository";
import type { Mission } from "./types/Mission";

export type MissionResolutionStatus =
  | "BOUND"
  | "GENERAL"
  | "AMBIGUOUS"
  | "UNRESOLVED";

export interface MissionResolutionInput {
  missionId?: string;
  message: string;
}

export interface MissionResolution {
  status: MissionResolutionStatus;
  mission?: Mission;
  candidates?: Mission[];
}

const missionRepository = new PostgresMissionRepository();

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isMissionMentioned(message: string, mission: Mission): boolean {
  const haystack = normalize(message);
  const title = normalize(mission.title);

  if (title.length >= 4 && haystack.includes(title)) return true;

  const meaningfulWords = title
    .split(/\s+/)
    .filter((word) => word.length >= 5);

  return meaningfulWords.length >= 2
    ? meaningfulWords.filter((word) => haystack.includes(word)).length >= 2
    : false;
}

export async function resolveMission(
  input: MissionResolutionInput,
): Promise<MissionResolution> {
  if (input.missionId) {
    const explicitMission = await missionRepository.get(input.missionId);
    return explicitMission
      ? { status: "BOUND", mission: explicitMission }
      : { status: "UNRESOLVED" };
  }

  const missions = await missionRepository.list();
  const candidates = missions.filter((mission) =>
    mission.status !== "completed" &&
    mission.status !== "cancelled" &&
    isMissionMentioned(input.message, mission),
  );

  if (candidates.length === 1) {
    return { status: "BOUND", mission: candidates[0] };
  }

  if (candidates.length > 1) {
    return { status: "AMBIGUOUS", candidates };
  }

  return { status: "GENERAL" };
}
