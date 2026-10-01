import { advanceAcquisitionLifecycle, type AcquisitionLifecycleSignal } from "./lifecycle";
import {
  loadAcquisitionRecord,
  saveAcquisitionRecord,
  type AcquisitionRecord,
} from "./acquisition-store";

export type AcquisitionOperatorDecision =
  | "approve-specialist"
  | "approve-opportunity"
  | "defer"
  | "reject";

export interface AcquisitionDecisionResult {
  record: AcquisitionRecord;
  resumed: boolean;
}

function signalFor(
  decision: Exclude<AcquisitionOperatorDecision, "defer" | "reject">,
): AcquisitionLifecycleSignal {
  return decision === "approve-specialist"
    ? { type: "operator-approved-specialist" }
    : { type: "operator-approved-opportunity" };
}

export async function applyAcquisitionOperatorDecision(input: {
  workspaceId: string;
  submissionId: string;
  decision: AcquisitionOperatorDecision;
  now?: Date;
}): Promise<AcquisitionDecisionResult | null> {
  const record = await loadAcquisitionRecord(input.workspaceId, input.submissionId);
  if (!record) return null;

  if (record.lifecycle.state !== "decision-required") {
    throw new Error("Acquisition decision is not currently required.");
  }

  if (input.decision === "defer") {
    return { record, resumed: false };
  }

  const lifecycle = input.decision === "reject"
    ? advanceAcquisitionLifecycle(record.lifecycle, { type: "closed" }, input.now)
    : advanceAcquisitionLifecycle(record.lifecycle, signalFor(input.decision), input.now);

  await saveAcquisitionRecord({
    workspaceId: record.workspaceId,
    qualification: record.qualification,
    decisionBrief: record.decisionBrief,
    lifecycle,
  });

  return {
    record: { ...record, lifecycle, updatedAt: input.now ?? new Date() },
    resumed: input.decision !== "reject",
  };
}
