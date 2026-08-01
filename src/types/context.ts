/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : context.ts
 * Responsibility :
 * Represents the contextual information
 * available when Clara processes an event.
 * ============================================
 */

import { Event } from "./event";

export interface Context {
  /**
   * Event currently being processed.
   */
  event: Event;

  /**
   * User identifier.
   */
  userId?: string;

  /**
   * Session identifier.
   */
  sessionId?: string;

  /**
   * Current date/time.
   */
  now: Date;

  /**
   * Additional contextual metadata.
   */
  metadata?: Record<string, unknown>;
}