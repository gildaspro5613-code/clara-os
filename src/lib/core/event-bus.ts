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

import { getRuntime } from "./runtime";

/**
 * Dispatches an event through
 * Clara's Cognitive Engine.
 */
export async function dispatchEvent(
  event: Event,
): Promise<void> {

  await getRuntime().processEvent(
    event,
  );

}