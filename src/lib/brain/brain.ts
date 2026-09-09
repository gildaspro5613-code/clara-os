// ============================================
// CLARA OS
// Brain Module
//
// File : brain.ts
// Responsibility :
// Main orchestration of Clara's Brain.
// ============================================

import {
  Event,
  Recommendation,
} from "@/types";

import { resolveExecutionDirective } from "@/lib/runtime/execution-directive-resolver";
import { shouldRemember } from "./learning";
import { buildBrainContext } from "./brain-context-builder";
import { reasoning } from "./reasoning";
import { prioritize } from "./priorities";
import { plan } from "./planners";
import { recommend } from "./recommendations";
import { buildDashboard, type BrainDashboard } from "./dashboard";

export function runBrain(
  event: Event,
): Recommendation {
  const dashboard = runBrainDashboard(event);
  return dashboard.recommendation;
}

/**
 * Single source of truth for one complete Brain cycle.
 * Execution metadata is never inferred from recommendation/task text.
 * Only a trusted structured directive already present in Context may be
 * attached to a planned task.
 */
export function runBrainDashboard(
  event: Event,
): BrainDashboard {
  shouldRemember(event);

  const brainContext = buildBrainContext(event);
  const understanding = reasoning(
    brainContext.context,
    brainContext.memory,
  );
  const decision = prioritize(understanding);
  const tasks = plan(decision);

  const directive = resolveExecutionDirective(brainContext.context);
  if (directive && tasks[0]) {
    tasks[0] = {
      ...tasks[0],
      execution: directive,
    };
  }

  const recommendation = recommend(decision);

  return buildDashboard(
    brainContext.context,
    brainContext.memory,
    understanding,
    decision,
    tasks,
    recommendation,
  );
}
