// ============================================
// CLARA OS
// Missions Module
//
// File : apply-verification.ts
// Responsibility :
// Applies verified execution outcomes to durable Mission state.
// ============================================

import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import type { VerificationResult } from "@/lib/runtime/verification";

import { normalizeMission } from "./mission-normalizer";
import { PostgresMissionRepository } from "./postgres-mission-repository";
import type { Mission } from "./types/Mission";

const missionRepository = new PostgresMissionRepository();

export async function applyVerificationToMission(
  intent: ExecutionIntent,
  verification: VerificationResult,
): Promise<Mission | undefined> {
  if (
    verification.status !== "VERIFIED" ||
    !intent.missionId ||
    !intent.missionTaskId
  ) {
    return undefined;
  }

  const mission = await missionRepository.get(intent.missionId);
  if (!mission) return undefined;

  const taskExists = mission.tasks.some(
    (task) => task.id === intent.missionTaskId,
  );

  if (!taskExists) return undefined;

  const updated = normalizeMission({
    ...mission,
    tasks: mission.tasks.map((task) =>
      task.id === intent.missionTaskId
        ? { ...task, completed: true }
        : task,
    ),
    lastAction: verification.message,
    result: verification.message,
  });

  return missionRepository.upsert(updated);
}
