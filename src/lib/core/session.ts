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

import { Recommendation, Task } from "@/types";
import { ClaraState } from "./state";

export interface ClaraSession {
  state: ClaraState;
  recommendation: Recommendation | null;

  /**
   * Tasks produced by the latest Brain cycle.
   * Tasks without an explicit execution directive remain planning-only.
   */
  tasks: Task[];

  startedAt: Date;
  updatedAt: Date;
}

export function createSession(): ClaraSession {
  const now = new Date();

  return {
    state: ClaraState.STARTING,
    recommendation: null,
    tasks: [],
    startedAt: now,
    updatedAt: now,
  };
}
