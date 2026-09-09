/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : execution-intent.ts
 * Responsibility :
 * Defines a provider-independent request to
 * execute one normalized Clara capability.
 * ============================================
 */

export type ExecutionIntentMode = "READ" | "PREPARE" | "EXECUTE";

export interface ExecutionIntent {
  readonly id: string;
  readonly source: "BRAIN" | "WISDOM" | "USER" | "SYSTEM";
  readonly capabilityId: string;
  readonly mode: ExecutionIntentMode;
  readonly context: unknown;
  readonly missionId?: string;
  readonly conversationId?: string;
  readonly createdAt: Date;
}

export function createExecutionIntent(input: {
  capabilityId: string;
  mode: ExecutionIntentMode;
  context: unknown;
  source?: ExecutionIntent["source"];
  missionId?: string;
  conversationId?: string;
}): ExecutionIntent {
  return {
    id: crypto.randomUUID(),
    source: input.source ?? "BRAIN",
    capabilityId: input.capabilityId,
    mode: input.mode,
    context: input.context,
    missionId: input.missionId,
    conversationId: input.conversationId,
    createdAt: new Date(),
  };
}
