/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : reasoning.ts
 * Responsibility :
 * Produces structured reasoning from the
 * current brain context and memories.
 * ============================================
 */

import { buildContext } from "./context";
import { retrieveMemories } from "./memory";

export interface Reasoning {
  summary: string;

  observations: readonly string[];

  risks: readonly string[];

  opportunities: readonly string[];

  confidence: number;
}

/**
 * Produces a reasoning object from the current event.
 */
export async function reason(event: unknown): Promise<Reasoning> {
  const context = await buildContext(event);
  const memories = await retrieveMemories(context);

  const observations: string[] = [];

  if (memories.length > 0) {
    observations.push(
      `${memories.length} relevant memories retrieved.`
    );
  }

  if (context.intent) {
    observations.push(`Intent detected: ${context.intent}`);
  }

  const risks: string[] = [];

  if (memories.length === 0) {
    risks.push("No relevant memory available.");
  }

  const opportunities: string[] = [];

  if (context.intent) {
    opportunities.push(
      `Plan actions around "${context.intent}".`
    );
  }

  return Object.freeze({
    summary:
      observations.length > 0
        ? observations.join(" ")
        : "No significant reasoning available.",

    observations: Object.freeze(observations),

    risks: Object.freeze(risks),

    opportunities: Object.freeze(opportunities),

    confidence: memories.length > 0 ? 0.9 : 0.6,
  });
}