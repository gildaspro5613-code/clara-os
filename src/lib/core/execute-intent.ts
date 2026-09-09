/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : execute-intent.ts
 * Responsibility :
 * Runs one explicit ExecutionIntent through the
 * complete guarded operational cycle.
 * ============================================
 */

import type { ExecutionIntent } from "@/lib/runtime/execution-intent";
import {
  ExecutionCoordinator,
  type ExecutionCoordinatorResult,
} from "@/lib/runtime/execution-coordinator";
import type { Runtime } from "@/lib/runtime/runtime";
import { applyVerificationToMission } from "@/modules/missions/apply-verification";

import type { Clara } from "./clara";

const coordinator = new ExecutionCoordinator();

export interface ExecuteIntentOptions {
  executeAuthorized?: boolean;
  evidence?: unknown;
}

/**
 * Executes only an already-explicit ExecutionIntent.
 *
 * Order is deliberate:
 * Gate -> Runtime -> Verification -> durable Mission -> durable Journal.
 * A non-ALLOW gate never reaches Runtime. A mission only progresses after
 * VERIFIED evidence. Every attempted gated cycle is journaled.
 */
export async function executeIntent(
  clara: Clara,
  runtime: Runtime,
  intent: ExecutionIntent,
  options: ExecuteIntentOptions = {},
): Promise<ExecutionCoordinatorResult> {
  const result = await coordinator.run(runtime, intent, options);

  if (result.verification) {
    await applyVerificationToMission(intent, result.verification);
  }

  await clara.recordExecution(intent, result);
  return result;
}
