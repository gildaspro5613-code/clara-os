/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : autonomy-gate.ts
 * Responsibility :
 * Applies Clara OS autonomy policy before a
 * capability may enter Runtime.
 * ============================================
 */

import type { ExecutionIntent } from "./execution-intent";

export type AutonomyGateOutcome = "ALLOW" | "CONFIRM" | "DENY" | "ESCALATE";

export interface AutonomyGateDecision {
  readonly outcome: AutonomyGateOutcome;
  readonly reason: string;
  readonly intent: ExecutionIntent;
  readonly decidedAt: Date;
}

/**
 * First code-level Autonomy Gate.
 *
 * READ and PREPARE are non-executing capability modes and can proceed.
 * EXECUTE must not enter Runtime until explicit authorization policy is
 * supplied by the caller. This keeps execution closed by default.
 */
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
