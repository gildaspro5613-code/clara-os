/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : execution-directive-resolver.ts
 * Responsibility :
 * Resolves trusted, structured execution metadata.
 * Never infers capabilities from natural-language text.
 * ============================================
 */

import { isKnownCapabilityId } from "@/lib/capabilities/capability-catalog";
import type { Context } from "@/types";
import {
  isExecutionDirective,
  type ExecutionDirective,
} from "./execution-directive";

interface StructuredExecutionPayload {
  executionDirective?: unknown;
}

/**
 * V1 trusted source: a structured executionDirective carried by the event
 * payload. Natural-language fields are deliberately ignored.
 *
 * The capability id must exist in Clara OS' canonical capability catalog.
 * Mission/conversation bindings from Brain Context override payload values
 * when available, keeping the directive attached to the resolved operation.
 */
export function resolveExecutionDirective(
  context: Context,
): ExecutionDirective | undefined {
  const payload =
    context.event.payload && typeof context.event.payload === "object"
      ? context.event.payload as StructuredExecutionPayload
      : undefined;

  if (!isExecutionDirective(payload?.executionDirective)) {
    return undefined;
  }

  const directive = payload.executionDirective;
  if (!isKnownCapabilityId(directive.capabilityId)) {
    return undefined;
  }

  const missionId = context.metadata?.missionId;
  const conversationId = context.metadata?.conversationId;

  return {
    ...directive,
    capabilityId: directive.capabilityId,
    missionId:
      typeof missionId === "string" ? missionId : directive.missionId,
    conversationId:
      typeof conversationId === "string"
        ? conversationId
        : directive.conversationId,
  };
}
