/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : events.ts
 * Responsibility :
 * Factory used to create Clara events.
 * ============================================
 */

import {
  Event,
  EventType,
} from "@/types";

/**
 * Creates a system event.
 */
export function createSystemEvent(): Event {

  return {
    id: crypto.randomUUID(),
    type: EventType.SYSTEM,
    source: "CLARA_CORE",
    timestamp: new Date(),
  };

}