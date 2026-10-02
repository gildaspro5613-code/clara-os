import type { ClaraSession } from "@/lib/core/session";
import type { AcquisitionRecord } from "./acquisition-store";

export type AcquisitionE2EStage =
  | "received"
  | "qualified"
  | "decision-required"
  | "resumed"
  | "closed";

export interface AcquisitionE2EStatus {
  submissionId: string;
  stage: AcquisitionE2EStage;
  lifecycleState: AcquisitionRecord["lifecycle"]["state"];
  decisionRequired: boolean;
  missionId: string | null;
  missionStatus: string | null;
  updatedAt: string;
}

/**
 * Read-only projection used to verify the real MD -> Clara OS acquisition path.
 * It deliberately derives its answer from durable acquisition + mission state;
 * it does not create a second workflow or mutate Clara's runtime.
 */
export function acquisitionE2EStatus(
  record: AcquisitionRecord,
  session: ClaraSession,
): AcquisitionE2EStatus {
  const missionId = session.mission?.id ?? null;
  const missionStatus = session.mission?.status ?? null;

  let stage: AcquisitionE2EStage = "qualified";

  if (record.lifecycle.state === "decision-required") {
    stage = "decision-required";
  } else if (record.lifecycle.state === "closed") {
    stage = "closed";
  } else if (missionId && missionStatus === "active") {
    stage = "resumed";
  } else if (!missionId) {
    stage = "received";
  }

  return {
    submissionId: record.submissionId,
    stage,
    lifecycleState: record.lifecycle.state,
    decisionRequired: record.lifecycle.decisionRequired,
    missionId,
    missionStatus,
    updatedAt: record.updatedAt.toISOString(),
  };
}
