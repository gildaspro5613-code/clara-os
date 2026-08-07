/**
 * ============================================
 * CLARA OS
 * Life Module
 * --------------------------------------------
 * File : LifeEngine.ts
 * Responsibility :
 * Defines Clara's global life states.
 * No implementation.
 * No business logic.
 * ============================================
 */

export enum LifeState {
  IDLE = "idle",
  FOCUSED = "focused",
  THINKING = "thinking",
  LISTENING = "listening",
  SPEAKING = "speaking",
  AWAY = "away",
}

export interface LifeContext {
  state: LifeState;
  updatedAt: Date;
}

export const defaultLifeContext: LifeContext = {
  state: LifeState.IDLE,
  updatedAt: new Date(),
};