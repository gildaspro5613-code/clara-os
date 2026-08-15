/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : brain-context-builder.ts
 * Responsibility :
 * Builds the complete BrainContext required
 * for one cognitive cycle.
 * ============================================
 */

import { Event } from "@/types";

import { getKnowledge } from "@/lib/knowledge";

import { buildContext } from "./context";
import { loadMemory } from "./memory";
import { BrainContext } from "./brain-context";

/**
 * Builds the complete cognitive context.
 */
export function buildBrainContext(
  event: Event,
): BrainContext {

  /*
   * Build execution context.
   */
  const context = buildContext(event);

  /*
   * Load Clara's knowledge.
   */
  const knowledge = getKnowledge();

  /*
   * Load relevant memory.
   */
  const memory = loadMemory(
    context,
  );

  /*
   * Return the complete cognitive context.
   */
  return {

    context,

    knowledge,

    memory,

  };

}