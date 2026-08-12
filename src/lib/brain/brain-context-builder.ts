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
import { loadBrevoContext } from "@/lib/connectors/internal/brevo";

import { buildContext, enrichContext } from "./context";
import { loadMemory } from "./memory";
import { BrainContext } from "./brain-context";

/**
 * Builds the complete cognitive context.
 */
export async function buildBrainContext(
  event: Event,
): Promise<BrainContext> {

  /*
   * Build execution context.
   */
  let context = buildContext(event);

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
   * Enrich context with Brevo data
   * when the event is Brevo-relevant.
   */
  const brevoMetadata = await loadBrevoContext(event);

  if (Object.keys(brevoMetadata).length > 0) {
    context = enrichContext(context, brevoMetadata);
  }

  /*
   * Return the complete cognitive context.
   */
  return {

    context,

    knowledge,

    memory,

  };

}