/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : lifecycle.ts
 * Responsibility :
 * Defines Clara lifecycle helpers.
 * ============================================
 */

import { ClaraState } from "./state";

/**
 * Returns whether Clara can start.
 */
export function canStart(state: ClaraState): boolean {
  return state === ClaraState.STOPPED;
}

/**
 * Returns whether Clara can stop.
 */
export function canStop(state: ClaraState): boolean {
  return state === ClaraState.WORKING;
}

/**
 * Returns whether Clara is running.
 */
export function isRunning(state: ClaraState): boolean {
  return (
    state === ClaraState.STARTING ||
    state === ClaraState.WORKING
  );
}