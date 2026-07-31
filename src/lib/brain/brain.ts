/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : brain.ts
 * Responsibility :
 * Public entry point for Clara's Brain.
 * Executes one complete reasoning cycle.
 * ============================================
 */

import { Event, Recommendation } from "../../types";

import { buildContext } from "./context";
import { loadMemory } from "./memory";
import { reasoning } from "./reasoning";
import { prioritize } from "./priorities";
import { plan } from "./planners";
import { recommend } from "./recommendations";

/**
 * Executes one complete reasoning cycle.
 */
export async function runBrain(
  event: Event
): Promise<Recommendation[]> {
  // Build working context
  const context = await buildContext(event);

  // Load Clara's memory
  const memory = await loadMemory();

  // Understand the current situation
  const understanding = await reasoning(context, memory);

  // Determine priorities
  const priorities = await prioritize(understanding);

  // Build an action plan
  const planning = await plan(priorities);

  // Produce recommendations
  return await recommend(planning);
}