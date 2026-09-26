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

import { Context, Event } from "@/types";

/**
 * Build a processing context from an incoming event.
 */
export function buildContext(event: Event): Context {
  return {
    event,
    userId: event.context?.userId,
    sessionId: event.context?.sessionId,
    now: new Date(),
    metadata: {
      productId: event.context?.productId,
      workspaceId: event.context?.workspaceId,
      ...(event.context?.metadata ?? {}),
    },
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