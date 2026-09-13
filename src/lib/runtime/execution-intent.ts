/**
 * CLARA OS — provider-neutral execution intent.
 * Brain/Wisdom/User request a capability; provider selection remains below Brain.
 */
export type ExecutionIntentMode = "READ" | "PREPARE" | "EXECUTE";

export interface ExecutionIntent {
  readonly id: string;
  readonly source: "BRAIN" | "WISDOM" | "USER" | "SYSTEM";
  readonly capabilityId: string;
  readonly mode: ExecutionIntentMode;
  readonly context: unknown;
  readonly missionId?: string;
  readonly missionTaskId?: string;
  readonly conversationId?: string;
  readonly createdAt: Date;
}

export function createExecutionIntent(input: {
  capabilityId: string;
  mode: ExecutionIntentMode;
  context: unknown;
  source?: ExecutionIntent["source"];
  missionId?: string;
  missionTaskId?: string;
  conversationId?: string;
}): ExecutionIntent {
  return {
    id: crypto.randomUUID(),
    source: input.source ?? "BRAIN",
    capabilityId: input.capabilityId,
    mode: input.mode,
    context: input.context,
    missionId: input.missionId,
    missionTaskId: input.missionTaskId,
    conversationId: input.conversationId,
    createdAt: new Date(),
  };
}
