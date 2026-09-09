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

interface UserMessageContextPayload {
  conversationId?: unknown;
  organizationId?: unknown;
  missionId?: unknown;
  mission?: unknown;
  missionResolution?: unknown;
  recentJournalActions?: unknown;
}

/**
 * Build a processing context from an incoming event.
 *
 * Durable identity and mission snapshots are carried by the event so Brain
 * remains independent from persistence and connector providers.
 */
export function buildContext(event: Event): Context {
  const metadata: Record<string, unknown> = {};

  if (event.type === EventType.USER_MESSAGE && event.payload) {
    const payload = event.payload as UserMessageContextPayload;

    if (typeof payload.conversationId === "string") {
      metadata.conversationId = payload.conversationId;
    }

    if (typeof payload.organizationId === "string") {
      metadata.organizationId = payload.organizationId;
    }

    if (typeof payload.missionResolution === "string") {
      metadata.missionResolution = payload.missionResolution;
    }

    if (Array.isArray(payload.recentJournalActions)) {
      metadata.recentJournalActions = payload.recentJournalActions;
    }

    if (typeof payload.missionId === "string") {
      metadata.missionId = payload.missionId;
    }

    if (payload.mission && typeof payload.mission === "object") {
      metadata.mission = payload.mission;
    }
  }

  return { event, now: new Date(), metadata };
}

/** Add additional metadata to an existing context. */
export function enrichContext(
  context: Context,
  metadata: Record<string, unknown>,
): Context {
  return {
    ...context,
    metadata: { ...(context.metadata ?? {}), ...metadata },
  };
}

/** Validate that a context contains the minimum information required by Brain. */
export function isValidContext(context: Context): boolean {
  return context.event !== undefined && context.now instanceof Date;
}
