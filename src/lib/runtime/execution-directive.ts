/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : execution-directive.ts
 * Responsibility :
 * Defines the explicit capability metadata required
 * before a Brain task may become an ExecutionIntent.
 * ============================================
 */

import type { ExecutionIntentMode } from "./execution-intent";

export interface ExecutionDirective {
  readonly capabilityId: string;
  readonly mode: ExecutionIntentMode;
  readonly context?: unknown;
  readonly missionId?: string;
  readonly missionTaskId?: string;
  readonly conversationId?: string;
}

export function isExecutionDirective(
  value: unknown,
): value is ExecutionDirective {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.capabilityId === "string" &&
    candidate.capabilityId.trim().length > 0 &&
    (candidate.mode === "READ" ||
      candidate.mode === "PREPARE" ||
      candidate.mode === "EXECUTE")
  );
}
