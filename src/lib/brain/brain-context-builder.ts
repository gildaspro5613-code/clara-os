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
import { buildBrainSources } from "./brain-source-registry";
import type { Mission } from "@/modules/missions/types/Mission";
import { CapabilityRegistry } from "@/lib/capabilities/capability-registry";

/**
 * Builds the complete cognitive context.
 */
export async function buildBrainContext(
  event: Event,
  mission?: Mission,
): Promise<BrainContext> {

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
   * Load registered Brain sources only when relevant.
   */
  const sources = await buildBrainSources(
    event,
    context.now,
  );

  /*
   * Load the capabilities available to Clara.
   */
  const capabilities =
    new CapabilityRegistry().getAvailableCapabilities();

  /*
   * Return the complete cognitive context.
   */
  return {

    context,

    knowledge,

    memory,

    sources,

    capabilities,

    mission,

  };

}