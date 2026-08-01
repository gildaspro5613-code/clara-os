/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : brain.ts
 * Responsibility :
 * Main orchestration of Clara's Brain.
 * ============================================
 */

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

/**
 * Execute one complete cognitive cycle.
 */
export function runBrain(
  event: Event,
): Recommendation {

  /*
   * Decide whether this event
   * should contribute to memory.
   */
  shouldRemember(event);

  /*
   * Build Clara's complete
   * cognitive context.
   */
  const brainContext = buildBrainContext(
    event,
  );

  /*
   * Understand the situation.
   */
  const understanding = reasoning(
    brainContext.context,
    brainContext.memory,
  );

  /*
   * Decide.
   */
  const decision = prioritize(
    understanding,
  );

  /*
   * Build execution plan.
   */
  plan(decision);

  /*
   * Produce recommendation.
   */
  return recommend(decision);

}