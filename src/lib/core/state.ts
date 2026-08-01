/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : state.ts
 * Responsibility :
 * Defines Clara's operational states.
 * ============================================
 */

export enum ClaraState {
  STOPPED = "STOPPED",
  STARTING = "STARTING",
  WORKING = "WORKING",
  STOPPING = "STOPPING",
}