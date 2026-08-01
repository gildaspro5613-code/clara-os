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
import { reasoning } from "./reasoning";
import { prioritize } from "./priorities";
import { plan } from "./planners";
import { recommend } from "./recommendations";

/**
 * Execute the complete Brain pipeline.
 */
export function runBrain(event: Event): Recommendation {

  const context = buildContext(event);

  const memory = loadMemory(context);

  const understanding = reasoning(
    context,
    memory
  );

  const decision = prioritize(
    understanding
  );

  // Execution plan generated for future execution.
  // It is intentionally kept although not yet consumed.
  plan(decision);

  return recommend(decision);
}