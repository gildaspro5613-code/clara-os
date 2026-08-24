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
import type { Mission } from "@/modules/missions/types/Mission";

/**
 * Execute one complete cognitive cycle
 * and return the recommendation produced
 * by Clara's Brain.
 */
export async function runBrain(
  event: Event,
  mission?: Mission,
): Promise<Recommendation> {

  const dashboard = await runBrainDashboard(
    event,
    mission,
  );

  return dashboard.recommendation;
}

/**
 * Execute one complete cognitive cycle
 * and return the complete Brain dashboard.
 *
 * This is the single source of truth for
 * the Brain execution pipeline.
 */
export async function runBrainDashboard(
  event: Event,
  mission?: Mission,
): Promise<BrainDashboard> {

  /**
   * Decide whether this event
   * should contribute to memory.
   */
  shouldRemember(event);

  /**
   * Build Clara's complete
   * cognitive context.
   */
  const brainContext = await buildBrainContext(
    event,
    mission,
  );

  /**
   * Understand the situation.
   */
  const understanding = await reasoning(
    brainContext.context,
    brainContext.memory,
    brainContext.sources,
    brainContext.mission,
    brainContext.capabilities,
    brainContext.knowledge,
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
    brainContext.sources,
    understanding,
    decision,
    tasks,
    recommendation,
  );
}
