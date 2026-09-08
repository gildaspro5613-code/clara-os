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

export interface UserMessageEventPayload {
  message: string;
  locale: string;
  conversationId?: string;
  missionId?: string;
  missionResolution?: "BOUND" | "GENERAL" | "AMBIGUOUS" | "UNRESOLVED";
}

/**
 * Creates a conversational event entering Clara Core.
 *
 * The payload intentionally stays transport-agnostic so the same Brain
 * pipeline can later be used from the Cockpit, Clara page or another UI.
 */
export function createUserMessageEvent(
  payload: UserMessageEventPayload,
): Event {
  return {
    id: crypto.randomUUID(),
    type: EventType.USER_MESSAGE,
    source: "CLARA_CHAT",
    timestamp: new Date(),
    payload,
  };
}
