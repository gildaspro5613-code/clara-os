/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : event-bus.ts
 * Responsibility :
 * Entry point for all events entering
 * Clara's Cognitive Engine.
 * ============================================
 */

import { Event } from "@/types";
import type { Clara } from "./clara";

/**
 * Dispatches an event through
 * Clara's Cognitive Engine.
 */
export async function dispatchEvent(
  clara: Clara,
  event: Event,
) {
  return clara.processEvent(
    event,
  );
}
