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
  MissionTask,
} from "./types/Mission";

import type {
  RuntimeResult,
} from "@/lib/runtime/runtime-result";

/**
 * Executes one Mission Task when an execution
 * contract is available.
 */
export async function executeMissionTask(
  task: MissionTask,
): Promise<RuntimeResult> {

  if (!task.execution) {

    return {

      success: false,

      message:
        "Cette tâche ne possède aucune capacité d'exécution définie.",

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

  return engine.run(
    runtime,
    event,
  );

}
