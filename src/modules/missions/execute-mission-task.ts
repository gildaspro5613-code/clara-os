/**
 * ============================================
 * CLARA OS
 * Missions Module
 *
 * File : execute-mission-task.ts
 * Responsibility :
 * Execute one Mission Task through Clara Runtime.
 * ============================================
 */

import { RuntimeEngine } from "@/lib/runtime/runtime-engine";
import { RuntimeFactory } from "@/lib/runtime/runtime-factory";

import type {
  Mission,
  MissionTask,
} from "./types/Mission";

import { canExecuteAutonomously } from "./autonomy-gate";

import type {
  RuntimeResult,
} from "@/lib/runtime/runtime-result";

/**
 * Executes one Mission Task when an execution
 * contract is available.
 */
export async function executeMissionTask(
  task: MissionTask,
  mission: Mission,
): Promise<RuntimeResult> {

  if (!task.execution) {

    return {

      success: false,

      message:
        "Cette tâche ne possède aucune capacité d'exécution définie.",

      completedAt: new Date(),

    };

  }

  if (!canExecuteAutonomously(task)) {

    return {

      success: false,

      message:
        "Cette tâche n'est pas autorisée pour une exécution autonome.",

      completedAt: new Date(),

    };

  }

  const runtime =
    RuntimeFactory.create();

  const event =
    RuntimeFactory.createEvent(
      task.execution.capabilityId,
      task.execution.context,
      "mission",
    );

  const engine =
    new RuntimeEngine();

  const result = await engine.run(
    runtime,
    event,
  );

  return result;

}
