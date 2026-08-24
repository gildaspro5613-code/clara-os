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

import {
  RuntimeCycle,
} from "@/lib/runtime/runtime-cycle";

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

  const runtime =
    RuntimeFactory.create();

  const event =
    RuntimeFactory.createEvent(
      task.execution?.capabilityId ?? "unknown",
      task.execution?.context ?? {},
      "mission",
    );

  if (!task.execution) {

    return {

      success: false,

      message:
        "Cette tâche ne possède aucune capacité d'exécution définie.",

      runtimeId:
        runtime.id,

      eventId:
        event.id,

      cycles: [
        RuntimeCycle.RECEIVE,
        RuntimeCycle.CONTEXT,
        RuntimeCycle.COMPLETE,
      ],

      experienceCount: 0,

      completedAt:
        new Date(),

    };

  }

  if (!canExecuteAutonomously(task)) {

    return {

      success: false,

      message:
        "Cette tâche n'est pas autorisée pour une exécution autonome.",

      runtimeId:
        runtime.id,

      eventId:
        event.id,

      cycles: [
        RuntimeCycle.RECEIVE,
        RuntimeCycle.CONTEXT,
        RuntimeCycle.COMPLETE,
      ],

      experienceCount: 0,

      completedAt:
        new Date(),

    };

  }

  const engine =
    new RuntimeEngine();

  const result =
    await engine.run(
      runtime,
      event,
    );

  return result;

}
