/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : reasoning.ts
 * Responsibility :
 * Analyse the current context and memory to
 * produce Clara's understanding.
 * ============================================
 */

import {
  Context,
  Memory,
  Understanding,
} from "@/types";

/**
 * Analyse the current situation.
 */
export function reasoning(
  context: Context,
  memory: Memory
): Understanding {
  const eventType = context.event.type;

  return {
    intent: eventType,
    summary: `Processing event of type ${eventType}.`,
    confidence: 1,
    entities: [
      context.event.source,
      ...memory.facts,
    ],
    nextAction: "prioritize",
  };
}