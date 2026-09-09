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

import { Event, EventType } from "@/types";

/** Creates a system event. */
export function createSystemEvent(): Event {
  return {
    id: crypto.randomUUID(),
    type: EventType.SYSTEM,
    source: "CLARA_CORE",
    timestamp: new Date(),
  };
}

export interface UserMessageEventPayload {
  message: string;
  locale: string;
  conversationId?: string;
  organizationId?: string;
  missionId?: string;
  mission?: unknown;
  missionResolution?: "BOUND" | "GENERAL" | "AMBIGUOUS" | "UNRESOLVED";
}

/**
 * Creates a conversational event entering Clara Core.
 *
 * Organization identity is transport-neutral and follows the event through
 * Brain into Runtime so connector selection can be tenant-aware.
 */
export function createUserMessageEvent(payload: UserMessageEventPayload): Event {
  return {
    id: crypto.randomUUID(),
    type: EventType.USER_MESSAGE,
    source: "CLARA_CHAT",
    timestamp: new Date(),
    payload,
  };
}
