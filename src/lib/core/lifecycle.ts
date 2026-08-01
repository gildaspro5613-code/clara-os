/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : lifecycle.ts
 * Responsibility :
 * Manages Clara's lifecycle transitions.
 * ============================================
 */

import { ClaraState } from "./clara";

/**
 * Returns whether Clara can start.
 */
export function canStart(
  state: ClaraState
): boolean {
  return state === ClaraState.STOPPED;
}

/**
 * Returns whether Clara can stop.
 */
export function canStop(
  state: ClaraState
): boolean {
  return state === ClaraState.WORKING;
}

/**
 * Computes the next lifecycle state.
 */
export function nextState(
  current: ClaraState
): ClaraState {

  switch (current) {

    case ClaraState.STOPPED:
      return ClaraState.STARTING;

    case ClaraState.STARTING:
      return ClaraState.WORKING;

    case ClaraState.WORKING:
      return ClaraState.STOPPING;

    case ClaraState.STOPPING:
      return ClaraState.STOPPED;

    default:
      return current;
  }
}