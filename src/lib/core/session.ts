/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : session.ts
 * Responsibility :
 * Represents Clara's current working session.
 * ============================================
 */

import { Recommendation } from "@/types";
import { ClaraState } from "./state";

export interface ClaraSession {
  /**
   * Current operational state.
   */
  state: ClaraState;

  /**
   * Current recommendation produced
   * by Clara's Brain.
   */
  recommendation: Recommendation | null;

  /**
   * Session creation date.
   */
  startedAt: Date;

  /**
   * Last update.
   */
  updatedAt: Date;
}

/**
 * Creates a new Clara session.
 */
export function createSession(): ClaraSession {
  const now = new Date();

  return {
    state: ClaraState.STARTING,
    recommendation: null,
    startedAt: now,
    updatedAt: now,
  };
}