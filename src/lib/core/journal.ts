/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : journal.ts
 * Responsibility :
 * Stores Clara's recent activity.
 * ============================================
 */

import { Event } from "@/types";

const journal: Event[] = [];

/**
 * Records a new event.
 */
export function recordEvent(
  event: Event,
): void {

  journal.unshift(event);

}

/**
 * Returns all recorded events.
 */
export function getJournal(): Event[] {

  return [...journal];

}

/**
 * Returns the most recent events.
 */
export function getRecentEvents(
  limit = 10,
): Event[] {

  return journal.slice(0, limit);

}

/**
 * Clears the journal.
 */
export function clearJournal(): void {

  journal.length = 0;

}