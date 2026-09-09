/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : verification.ts
 * Responsibility :
 * Verifies runtime outcomes before they may
 * advance operational state such as Missions.
 * ============================================
 */

import type { ExecutionIntent } from "./execution-intent";
import type { RuntimeResult } from "./runtime-result";

export type VerificationStatus = "VERIFIED" | "FAILED" | "PENDING" | "UNKNOWN";

export interface VerificationResult {
  readonly status: VerificationStatus;
  readonly intentId: string;
  readonly missionId?: string;
  readonly message: string;
  readonly evidence?: unknown;
  readonly verifiedAt: Date;
}

/**
 * Generic verification policy.
 *
 * A successful Runtime call is not automatically proof that an external
 * action really happened. READ/PREPARE outcomes may be verified from their
 * returned result. EXECUTE requires explicit evidence from the capability
 * layer and otherwise remains pending.
 */
export function verifyRuntimeResult(
  intent: ExecutionIntent,
  result: RuntimeResult,
  evidence?: unknown,
): VerificationResult {
  if (!result.success) {
    return {
      status: "FAILED",
      intentId: intent.id,
      missionId: intent.missionId,
      message: result.message,
      evidence,
      verifiedAt: new Date(),
    };
  }

  if (intent.mode === "EXECUTE" && evidence === undefined) {
    return {
      status: "PENDING",
      intentId: intent.id,
      missionId: intent.missionId,
      message: "Runtime reported success, but EXECUTE still requires capability-specific evidence.",
      verifiedAt: new Date(),
    };
  }

  return {
    status: "VERIFIED",
    intentId: intent.id,
    missionId: intent.missionId,
    message: result.message,
    evidence,
    verifiedAt: new Date(),
  };
}
