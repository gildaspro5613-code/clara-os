import { MAKE_CAPABILITIES } from "@/lib/connectors/make";
import type { OperationalCapabilityResult } from "../operational-result";
import { NOTIFY_TEAM_CAPABILITY_ID } from "./capability";

export const NOTIFY_TEAM_SCENARIO_KEY = "notify-team" as const;

export interface NotifyTeamContext {
  readonly message: string;
  readonly title?: string;
  readonly urgency?: "low" | "normal" | "high";
}

export interface MakeScenarioExecutor {
  execute(
    capabilityId: string,
    workspaceId: string | undefined,
    context: unknown,
  ): Promise<OperationalCapabilityResult>;
}

function normalizeContext(context: unknown): NotifyTeamContext | null {
  const candidate = context as Partial<NotifyTeamContext> | null;
  const message = typeof candidate?.message === "string" ? candidate.message.trim() : "";
  if (!message) return null;

  const title = typeof candidate?.title === "string" && candidate.title.trim()
    ? candidate.title.trim()
    : undefined;
  const urgency = candidate?.urgency === "low" || candidate?.urgency === "normal" || candidate?.urgency === "high"
    ? candidate.urgency
    : undefined;

  return { message, title, urgency };
}

/** Executes the semantic Clara capability through the configured Make scenario. */
export async function executeNotifyTeamCapability(
  makeExecutor: MakeScenarioExecutor,
  workspaceId: string | undefined,
  context: unknown,
): Promise<OperationalCapabilityResult> {
  const payload = normalizeContext(context);
  if (!payload) {
    return {
      capabilityId: NOTIFY_TEAM_CAPABILITY_ID,
      success: false,
      provider: "make",
      status: "failed",
      error: {
        code: "INVALID_INPUT",
        message: "A non-empty notification message is required.",
        retryable: false,
      },
    };
  }

  const result = await makeExecutor.execute(
    MAKE_CAPABILITIES.SCENARIO_EXECUTE,
    workspaceId,
    { scenarioKey: NOTIFY_TEAM_SCENARIO_KEY, payload },
  );

  return {
    ...result,
    capabilityId: NOTIFY_TEAM_CAPABILITY_ID,
  };
}
