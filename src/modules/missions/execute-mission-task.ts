import { RuntimeFactory } from "@/lib/runtime/runtime-factory";
import {
  createExecutionIntent,
} from "@/lib/runtime/execution-intent";
import { ExecutionCoordinator } from "@/lib/runtime/execution-coordinator";
import { RuntimeCycle } from "@/lib/runtime/runtime-cycle";
import type { RuntimeResult } from "@/lib/runtime/runtime-result";
import {
  withActorContext,
  type ActorContext,
} from "@/lib/core/actor-context";

import type {
  Mission,
  MissionTask,
} from "./types/Mission";

function refusedResult(
  runtimeId: string,
  eventId: string,
  message: string,
): RuntimeResult {
  return {
    success: false,
    message,
    runtimeId,
    eventId,
    cycles: [
      RuntimeCycle.RECEIVE,
      RuntimeCycle.CONTEXT,
      RuntimeCycle.COMPLETE,
    ],
    experienceCount: 0,
    completedAt: new Date(),
  };
}

/**
 * Executes one Mission Task through the protected Clara OS execution chain
 * while preserving the existing RuntimeResult contract used by Core.
 */
export async function executeMissionTask(
  task: MissionTask,
  mission: Mission,
  actor?: ActorContext,
): Promise<RuntimeResult> {
  const runtime = RuntimeFactory.create();

  if (!task.execution) {
    return refusedResult(
      runtime.id,
      crypto.randomUUID(),
      "Mission task execution contract is required before Runtime execution.",
    );
  }

  const intent = createExecutionIntent({
    capabilityId: task.execution.capabilityId,
    mode: task.execution.mode ?? "EXECUTE",
    context: actor
      ? withActorContext(task.execution.context, actor)
      : task.execution.context,
    source: "BRAIN",
    missionId: mission.id,
    missionTaskId: task.id,
  });

  const execution = await new ExecutionCoordinator().run(runtime, intent, {
    executeAuthorized: task.execution.autonomous,
  });

  if (execution.gate.outcome !== "ALLOW") {
    return refusedResult(runtime.id, intent.id, execution.gate.reason);
  }

  if (!execution.runtimeResult) {
    return refusedResult(
      runtime.id,
      intent.id,
      "Runtime execution did not produce a result.",
    );
  }

  if (execution.verification?.status !== "VERIFIED") {
    return {
      ...execution.runtimeResult,
      success: false,
      message:
        execution.verification?.message ??
        "Execution completed but could not be verified.",
    };
  }

  return execution.runtimeResult;
}
