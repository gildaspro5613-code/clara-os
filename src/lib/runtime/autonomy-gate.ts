import type { ExecutionIntent } from "./execution-intent";

export type AutonomyGateOutcome = "ALLOW" | "CONFIRM" | "DENY" | "ESCALATE";

export interface AutonomyGateDecision {
  readonly outcome: AutonomyGateOutcome;
  readonly reason: string;
  readonly intent: ExecutionIntent;
  readonly decidedAt: Date;
}

/** Clara OS owns authorization. Connectors never decide whether an action may run. */
export function evaluateAutonomy(
  intent: ExecutionIntent,
  options: { executeAuthorized?: boolean } = {},
): AutonomyGateDecision {
  if (intent.mode === "READ" || intent.mode === "PREPARE") {
    return {
      outcome: "ALLOW",
      reason: `${intent.mode} capability does not perform an external execution.`,
      intent,
      decidedAt: new Date(),
    };
  }

  if (options.executeAuthorized === true) {
    return {
      outcome: "ALLOW",
      reason: "EXECUTE capability explicitly authorized by Clara OS policy context.",
      intent,
      decidedAt: new Date(),
    };
  }

  return {
    outcome: "CONFIRM",
    reason: "EXECUTE capability requires explicit authorization before Runtime.",
    intent,
    decidedAt: new Date(),
  };
}
