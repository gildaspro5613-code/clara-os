/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : communication.ts
 * Responsibility :
 * Centralizes Clara's communication messages.
 * ============================================
 */

import { ClaraSession } from "@/lib/core";

import { buildGreeting } from "./greeting";

/**
 * Returns Clara's current message.
 */
export function buildMessage(
  session: ClaraSession,
): string {

  return buildGreeting(session);

}