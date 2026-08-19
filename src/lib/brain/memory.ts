/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : memory.ts
 * Responsibility :
 * Loads relevant memory available to the Brain.
 * ============================================
 */

import { Context, Memory } from "@/types";
import { getRememberedEvents } from "./memory-store";

/**
 * Maximum number of remembered events exposed
 * to the Brain during one reasoning cycle.
 */
const MAX_RELEVANT_MEMORIES = 10;

/**
 * Determines whether a remembered event is
 * relevant to the current context.
 *
 * V1 deliberately uses simple contextual signals:
 * - same event type
 * - same event source
 *
 * Richer semantic relevance will be introduced
 * in a later cognitive layer.
 */
function isRelevantToContext(
  rememberedType: string,
  rememberedSource: string,
  currentType: string,
  currentSource: string,
): boolean {
  return (
    rememberedType === currentType &&
    rememberedSource === currentSource
  );
}

/**
 * Creates a readable memory entry from an event.
 */
function formatMemoryEntry(event: {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  payload?: unknown;
}): string {
  const payload =
    event.payload !== undefined
      ? ` | payload: ${JSON.stringify(event.payload)}`
      : "";

  return `[${event.timestamp.toISOString()}] ${event.type} from ${event.source}${payload}`;
}

/**
 * Load memory relevant to the current context.
 *
 * V1:
 * - retrieves retained events
 * - filters them by current event type/source
 * - excludes the current event
 * - limits the amount of memory exposed to the Brain
 */
export function loadMemory(context: Context): Memory {
  const currentEvent = context.event;

  const relevantEvents = getRememberedEvents()
    .filter((event) => event.id !== currentEvent.id)
    .filter((event) =>
      isRelevantToContext(
        event.type,
        event.source,
        currentEvent.type,
        currentEvent.source,
      ),
    )
    .slice(-MAX_RELEVANT_MEMORIES);

  return {
    shortTerm: relevantEvents.map(formatMemoryEntry),
    longTerm: [],
    facts: [],
  };
}
