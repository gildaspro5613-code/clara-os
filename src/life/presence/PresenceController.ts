/**
 * ============================================
 * CLARA OS
 * Life Module
 * --------------------------------------------
 * File : PresenceController.ts
 * Responsibility :
 * Maps Clara's life state to visual behaviour.
 * No rendering.
 * No business logic.
 * ============================================
 */

import { LifeState } from "../engine/LifeEngine";

export interface PresenceProfile {
  breathing: boolean;
  blinking: boolean;
  gazeMovement: boolean;
  animation: string;
}

export const PresenceController: Record<LifeState, PresenceProfile> = {
  [LifeState.IDLE]: {
    breathing: true,
    blinking: true,
    gazeMovement: true,
    animation: "idle",
  },

  [LifeState.FOCUSED]: {
    breathing: true,
    blinking: true,
    gazeMovement: false,
    animation: "focused",
  },

  [LifeState.THINKING]: {
    breathing: true,
    blinking: true,
    gazeMovement: true,
    animation: "thinking",
  },

  [LifeState.LISTENING]: {
    breathing: true,
    blinking: true,
    gazeMovement: false,
    animation: "listening",
  },

  [LifeState.SPEAKING]: {
    breathing: true,
    blinking: true,
    gazeMovement: false,
    animation: "speaking",
  },

  [LifeState.AWAY]: {
    breathing: false,
    blinking: false,
    gazeMovement: false,
    animation: "away",
  },
};