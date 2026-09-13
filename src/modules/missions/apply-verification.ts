import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import type { VerificationResult } from "@/lib/runtime/verification";
import type { RuntimeResult } from "@/lib/runtime/runtime-result";

import { completeMissionTask } from "./complete-mission-task";
import { loadMission, saveMission } from "./mission-store";
import type { Mission } from "./types/Mission";

/** Applies only VERIFIED execution outcomes to the durable Mission state. */
export async function applyVerificationToMission(
  intent: ExecutionIntent,
  verification: VerificationResult,
  runtimeResult: RuntimeResult,
): Promise<Mission | undefined> {
  if (
    verification.status !== "VERIFIED" ||
    !intent.missionId ||
    !intent.missionTaskId
  ) {
    return undefined;
  }

  const mission = await loadMission(intent.missionId);
  if (!mission) return undefined;

  const taskExists = mission.tasks.some(
    (task) => task.id === intent.missionTaskId,
  );
  if (!taskExists) return undefined;

  const updated = completeMissionTask(
    mission,
    intent.missionTaskId,
    runtimeResult,
  );

  const verifiedMission: Mission = {
    ...updated,
    lastAction: verification.message,
    result:
      updated.status === "completed"
        ? verification.message
        : updated.result,
  };

  await saveMission(verifiedMission);
  return verifiedMission;
}
