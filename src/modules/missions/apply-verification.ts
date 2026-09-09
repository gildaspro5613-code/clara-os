// ============================================
// CLARA OS
// Missions Module
//
// File : apply-verification.ts
// Responsibility :
// Applies verified execution outcomes to Mission state.
// ============================================

import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import type { VerificationResult } from "@/lib/runtime/verification";

import { missionStore } from "./mission-store";
import type { Mission } from "./types/Mission";

export function applyVerificationToMission(
  intent: ExecutionIntent,
  verification: VerificationResult,
): Mission | undefined {
  if (
    verification.status !== "VERIFIED" ||
    !intent.missionId ||
    !intent.missionTaskId
  ) {
    return undefined;
  }

  const mission = missionStore.get(intent.missionId);
  if (!mission) return undefined;

  const taskExists = mission.tasks.some(
    (task) => task.id === intent.missionTaskId,
  );

  if (!taskExists) return undefined;

  const updated: Mission = {
    ...mission,
    tasks: mission.tasks.map((task) =>
      task.id === intent.missionTaskId
        ? { ...task, completed: true }
        : task,
    ),
    lastAction: verification.message,
    result: verification.message,
  };

  return missionStore.upsert(updated);
}
