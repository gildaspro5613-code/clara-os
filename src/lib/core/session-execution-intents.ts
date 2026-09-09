/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : session-execution-intents.ts
 * Responsibility :
 * Resolves only explicitly executable Brain tasks
 * from the current Clara session.
 * ============================================
 */

import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import { executionIntentFromTask } from "@/lib/runtime/task-to-execution-intent";

import type { ClaraSession } from "./session";

export function getSessionExecutionIntents(
  session: ClaraSession,
): ExecutionIntent[] {
  return session.tasks.flatMap((task) => {
    const intent = executionIntentFromTask(task);
    return intent ? [intent] : [];
  });
}
