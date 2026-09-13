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

/** Mission state may advance only from VERIFIED outcomes. */
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
