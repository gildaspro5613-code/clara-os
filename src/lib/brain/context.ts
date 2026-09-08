/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : context.ts
 * Responsibility :
 * Builds the execution context from an event.
 * ============================================
 */

import { Context, Event, EventType } from "@/types";
import { missionStore } from "@/modules/missions/mission-store";

interface UserMessageContextPayload {
  conversationId?: unknown;
  missionId?: unknown;
  missionResolution?: unknown;
}

/**
 * Build a processing context from an incoming event.
 *
 * Mission information is loaded only when the conversation bridge has
 * explicitly resolved a mission. The Brain therefore receives the current
 * canonical mission snapshot without making the Brain responsible for
 * mission resolution.
 */
export function buildContext(event: Event): Context {
  const metadata: Record<string, unknown> = {};

  if (event.type === EventType.USER_MESSAGE && event.payload) {
    const payload = event.payload as UserMessageContextPayload;

    if (typeof payload.conversationId === "string") {
      metadata.conversationId = payload.conversationId;
    }

    if (typeof payload.missionResolution === "string") {
      metadata.missionResolution = payload.missionResolution;
    }

    if (typeof payload.missionId === "string") {
      const mission = missionStore.get(payload.missionId);

      if (mission) {
        metadata.missionId = mission.id;
        metadata.mission = mission;
      }
    }
  }

  return {
    event,
    now: new Date(),
    metadata,
  };
}

/**
 * Add additional metadata to an existing context.
 */
export function enrichContext(
  context: Context,
  metadata: Record<string, unknown>
): Context {
  return {
    ...context,
    metadata: {
      ...(context.metadata ?? {}),
      ...metadata,
    },
  };
}

/**
 * Validate that a context contains the minimum
 * information required by the Brain.
 */
export function isValidContext(context: Context): boolean {
  return (
    context.event !== undefined &&
    context.now instanceof Date
  );
}