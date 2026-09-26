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
import { loadExternalProducts } from "@/lib/external-capabilities/config";
import { executeExternalProductCapability } from "@/lib/external-capabilities/product-callback";

/**
 * Executes one Mission Task when an execution
 * contract is available.
 */
export async function executeMissionTask(
  task: MissionTask,
  mission: Mission,
  workspaceId?: string,
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

  if (
    task.execution.executionLocation === "external-product" &&
    task.execution.productId &&
    task.execution.userId &&
    task.execution.workspaceId &&
    task.execution.sessionId
  ) {
    const product = loadExternalProducts().get(task.execution.productId);
    if (!product) {
      return {
        success: false, message: "External product is not configured.",
        runtimeId: runtime.id, eventId: event.id,
        cycles: [RuntimeCycle.RECEIVE, RuntimeCycle.CONTEXT, RuntimeCycle.COMPLETE],
        experienceCount: 0, completedAt: new Date(),
      };
    }
    const external = await executeExternalProductCapability(product, {
      capability: task.execution.capabilityId,
      userId: task.execution.userId,
      workspaceId: task.execution.workspaceId,
      sessionId: task.execution.sessionId,
      context: task.execution.context,
    });
    return {
      success: external.success,
      message: external.message,
      runtimeId: runtime.id,
      eventId: event.id,
      cycles: [RuntimeCycle.RECEIVE, RuntimeCycle.CONTEXT, RuntimeCycle.EXECUTE, RuntimeCycle.COMPLETE],
      experienceCount: 0,
      outputs: external.content ? [external.content] : undefined,
      completedAt: new Date(),
    };
  }

  const engine =
    new RuntimeEngine();

  const result =
    await engine.run(
      runtime,
      event,
      workspaceId,
    );

  return result;

}
