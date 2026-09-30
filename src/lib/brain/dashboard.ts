/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : dashboard.ts
 * Responsibility :
 * Build a dashboard view of the current
 * Brain execution.
 * ============================================
 */

import {
  Context,
  Memory,
  Understanding,
  Decision,
  Task,
  Recommendation,
} from "@/types";

import type { BrainSourceContext } from "./brain-source";
import { isMdProjectIntake } from "@/types";
import { qualifyProjectIntake, type AcquisitionQualification } from "@/lib/acquisition/qualification";
import { buildAcquisitionDecisionBrief, type AcquisitionDecisionBrief } from "@/lib/acquisition/decision-brief";
import { advanceAcquisitionLifecycle, initialAcquisitionLifecycle, type AcquisitionLifecycle } from "@/lib/acquisition/lifecycle";

export interface BrainDashboard {
  context: Context;
  memory: Memory;
  sources: BrainSourceContext[];
  understanding: Understanding;
  decision: Decision;
  tasks: Task[];
  recommendation: Recommendation;
  acquisition?: AcquisitionQualification;
  acquisitionDecisionBrief?: AcquisitionDecisionBrief;
  acquisitionLifecycle?: AcquisitionLifecycle;
  generatedAt: Date;
}

/**
 * Build a dashboard snapshot of the current
 * Brain execution.
 */
export function buildDashboard(
  context: Context,
  memory: Memory,
  sources: BrainSourceContext[],
  understanding: Understanding,
  decision: Decision,
  tasks: Task[],
  recommendation: Recommendation,
): BrainDashboard {
  const acquisition = context.event.type === "PROJECT_INTAKE_RECEIVED" && isMdProjectIntake(context.event.payload)
    ? qualifyProjectIntake(context.event.payload, understanding)
    : undefined;

  const acquisitionDecisionBrief = acquisition
    ? buildAcquisitionDecisionBrief(acquisition)
    : undefined;

  const acquisitionLifecycle = acquisition && acquisitionDecisionBrief
    ? advanceAcquisitionLifecycle(
        initialAcquisitionLifecycle(acquisition.submissionId),
        { type: "qualification-updated", qualification: acquisition, brief: acquisitionDecisionBrief },
      )
    : undefined;

  return {
    context,
    memory,
    sources,
    understanding,
    decision,
    tasks,
    recommendation,
    acquisition,
    acquisitionDecisionBrief,
    acquisitionLifecycle,
    generatedAt: new Date(),
  };
}
