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

import { buildContext } from "./context";
import { loadMemory } from "./memory";
import { shouldRemember } from "./learning";
import { reasoning } from "./reasoning";
import { prioritize } from "./priorities";
import { plan } from "./planners";
import { recommend } from "./recommendations";

/**
 * Execute the complete Brain pipeline.
 */
export function runBrain(
  event: Event,
): Recommendation {

  /*
   * 1. Build execution context.
   */
  const context = buildContext(event);

  /*
   * 2. Decide whether this event
   * should contribute to memory.
   */
  shouldRemember(event);

  /*
   * 3. Retrieve relevant memory.
   */
  const memory = loadMemory(context);

  /*
   * 4. Understand the situation.
   */
  const understanding = reasoning(
    context,
    memory,
  );

  /*
   * 5. Decide.
   */
  const decision = prioritize(
    understanding,
  );

  /*
   * 6. Build execution plan.
   */
  plan(decision);

  /*
   * 7. Produce recommendation.
   */
  return recommend(decision);

}