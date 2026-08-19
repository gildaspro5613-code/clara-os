// ============================================
// CLARA OS
// Core Module
//
// File : session.ts
// Responsibility :
// Represents Clara's current working session.
// ============================================

import type { Recommendation } from "@/types";
import type { BrainSourceContext } from "@/lib/brain/brain-source";
import type { Mission } from "@/modules/missions/types/Mission";
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
   * Current operational mission produced
   * by Clara's Brain.
   */
  mission: Mission | null;

  /**
   * External information sources available during the current cycle.
   */
  sources: BrainSourceContext[];

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
    mission: null,
    sources: [],
    startedAt: now,
    updatedAt: now,
  };
}
