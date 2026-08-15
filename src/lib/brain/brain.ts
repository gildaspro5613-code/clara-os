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

import { shouldRemember } from "./learning";
import { buildBrainContext } from "./brain-context-builder";
import { reasoning } from "./reasoning";
import { prioritize } from "./priorities";
import { plan } from "./planners";
import { recommend } from "./recommendations";
import { buildDashboard, type BrainDashboard } from "./dashboard";

/**
 * Execute one complete cognitive cycle
 * and return the recommendation produced
 * by Clara's Brain.
 */
export function runBrain(
  event: Event,
): Recommendation {

  const dashboard = runBrainDashboard(event);

  return dashboard.recommendation;
}

/**
 * Execute one complete cognitive cycle
 * and return the complete Brain dashboard.
 *
 * This is the single source of truth for
 * the Brain execution pipeline.
 */
export function runBrainDashboard(
  event: Event,
): BrainDashboard {

  /**
   * Decide whether this event
   * should contribute to memory.
   */
  shouldRemember(event);

  /**
   * Build Clara's complete
   * cognitive context.
   */
  const brainContext = buildBrainContext(event);

  /**
   * Understand the situation.
   */
  const understanding = reasoning(
    brainContext.context,
    brainContext.memory,
  );

  /**
   * Decide.
   */
  const decision = prioritize(
    understanding,
  );

  /**
   * Build execution plan.
   */
  const tasks = plan(decision);

  /**
   * Produce recommendation.
   */
  const recommendation = recommend(
    decision,
  );

  /**
   * Build the complete dashboard snapshot.
   */
  return buildDashboard(
    brainContext.context,
    brainContext.memory,
    understanding,
    decision,
    tasks,
    recommendation,
  );
}
