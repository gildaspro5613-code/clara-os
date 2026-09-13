import { RuntimeFactory } from "@/lib/runtime/runtime-factory";
import {
  createExecutionIntent,
} from "@/lib/runtime/execution-intent";
import {
  ExecutionCoordinator,
  type ExecutionCoordinatorResult,
} from "@/lib/runtime/execution-coordinator";

import type {
  Mission,
  MissionTask,
} from "./types/Mission";

/**
 * Executes one Mission Task through the protected Clara OS execution chain.
 */
export async function executeMissionTask(
  task: MissionTask,
  mission: Mission,
): Promise<ExecutionCoordinatorResult> {
  const runtime = RuntimeFactory.create();

  if (!task.execution) {
    throw new Error(
      "Mission task execution contract is required before Runtime execution.",
    );
  }

  const intent = createExecutionIntent({
    capabilityId: task.execution.capabilityId,
    mode: task.execution.mode ?? "EXECUTE",
    context: task.execution.context,
    source: "BRAIN",
    missionId: mission.id,
    missionTaskId: task.id,
  });

  const coordinator = new ExecutionCoordinator();

  return coordinator.run(runtime, intent, {
    executeAuthorized: task.execution.autonomous,
  });
}
