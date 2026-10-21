import {nativeContext} from "@/lib/native/scoped-context";
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
import type { Clara } from "./clara";

/**
 * Dispatches an event through
 * Clara's Cognitive Engine.
 */
export async function dispatchEvent(
  clara: Clara,
  event: Event,
) {
  const native=nativeContext();
  if(native)event={...event,context:{workspaceId:native.scope.workspaceId,userId:native.userId,sessionId:native.scope.sessionId,metadata:{clientId:native.scope.clientId,projectId:native.scope.projectId}}};
  return clara.processEvent(
    event,
  );
}
