/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : memory-store.ts
 * Responsibility :
 * Temporary in-memory storage for events
 * retained by Clara's Brain.
 * ============================================
 */

import { Event } from "@/types";

/**
 * Events retained during the current runtime.
 *
 * This is intentionally a first V1 implementation.
 * Persistence and richer contextual memory will be
 * introduced in later cognitive layers.
 */
const rememberedEvents: Event[] = [];

/**
 * Store an event when Clara decides it should
 * contribute to memory.
 */
export function rememberEvent(event: Event): void {
  rememberedEvents.push(event);
}

/**
 * Return the events currently available to memory.
 */
export function getRememberedEvents(): Event[] {
  return [...rememberedEvents];
}

/**
 * Clear the temporary memory store.
 *
 * Useful for tests and controlled runtime resets.
 */
export function clearRememberedEvents(): void {
  rememberedEvents.length = 0;
}
