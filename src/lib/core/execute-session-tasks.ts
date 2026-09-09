/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : execute-session-tasks.ts
 * Responsibility :
 * Connects explicitly executable Brain tasks to
 * Clara's guarded operational execution cycle.
 * ============================================
 */

import { RuntimeFactory } from "@/lib/runtime/runtime-factory";
import type { ExecutionCoordinatorResult } from "@/lib/runtime/execution-coordinator";

import type { Clara } from "./clara";
import type { ClaraSession } from "./session";
import { getSessionExecutionIntents } from "./session-execution-intents";
import { executeIntent, type ExecuteIntentOptions } from "./execute-intent";

export interface SessionTaskExecutionResult {
  readonly intentId: string;
  readonly capabilityId: string;
  readonly result: ExecutionCoordinatorResult;
}

/**
 * Runs only Tasks that already carry an explicit ExecutionDirective.
 *
 * No capability is inferred from task text. EXECUTE remains closed by
 * default because executeAuthorized is false/undefined unless an explicit
 * caller policy supplies authorization. READ/PREPARE may pass the Gate.
 */
export async function executeSessionTasks(
  clara: Clara,
  session: ClaraSession,
  options: ExecuteIntentOptions = {},
): Promise<SessionTaskExecutionResult[]> {
  const intents = getSessionExecutionIntents(session);

  if (intents.length === 0) {
    return [];
  }

  const runtime = RuntimeFactory.create();
  const results: SessionTaskExecutionResult[] = [];

  for (const intent of intents) {
    const result = await executeIntent(clara, runtime, intent, options);
    results.push({
      intentId: intent.id,
      capabilityId: intent.capabilityId,
      result,
    });
  }

  return results;
}
