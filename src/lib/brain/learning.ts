/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : learning.ts
 * Responsibility :
 * Determines what Clara should retain
 * from her experience.
 * ============================================
 */

import { Event } from "@/types";

/**
 * Determines whether an event
 * should be memorized.
 */
export function shouldRemember(
  event: Event,
): boolean {

  switch (event.type) {

    case "USER_MESSAGE":
    case "EMAIL_RECEIVED":
    case "PHONE_CALL":
    case "MEETING_CREATED":
    case "DOCUMENT_RECEIVED":
      return true;

    default:
      return false;

  }

}