// src/lib/brain/context.ts

import { BrainContext } from "./types";

/**
 * Construit le contexte d'une requête utilisateur.
 */
export function buildContext(
  input: string,
  options?: {
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }
): BrainContext {
  return {
    userId: options?.userId ?? "anonymous",
    sessionId: options?.sessionId ?? crypto.randomUUID(),
    input: input.trim(),
    timestamp: new Date(),
    metadata: options?.metadata,
  };
}

/**
 * Retourne une copie enrichie du contexte.
 */
export function enrichContext(
  context: BrainContext,
  metadata: Record<string, unknown>
): BrainContext {
  return {
    ...context,
    metadata: {
      ...(context.metadata ?? {}),
      ...metadata,
    },
  };
}

/**
 * Vérifie qu'un contexte est exploitable.
 */
export function isValidContext(context: BrainContext): boolean {
  return (
    context.input.length > 0 &&
    context.userId.length > 0 &&
    context.sessionId.length > 0
  );
}