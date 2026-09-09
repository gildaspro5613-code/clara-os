/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : task-to-execution-intent.ts
 * Responsibility :
 * Converts an explicitly executable Brain task into
 * a provider-independent ExecutionIntent.
 * ============================================
 */

import type { Task } from "@/types";
import { createExecutionIntent, type ExecutionIntent } from "./execution-intent";
import { isExecutionDirective } from "./execution-directive";

export function executionIntentFromTask(
  task: Task,
): ExecutionIntent | undefined {
  if (!isExecutionDirective(task.execution)) {
    return undefined;
  }

  return createExecutionIntent({
    source: "BRAIN",
    capabilityId: task.execution.capabilityId,
    mode: task.execution.mode,
    context: task.execution.context ?? {
      taskId: task.id,
      title: task.title,
      description: task.description,
      decisionId: task.decision.id,
      decisionSummary: task.decision.summary,
    },
    missionId: task.execution.missionId,
    missionTaskId: task.execution.missionTaskId,
    conversationId: task.execution.conversationId,
  });
}
