/**
 * ============================================
 * CLARA OS
 * Onboarding Module
 * --------------------------------------------
 * File : onboarding.ts
 * Responsibility :
 * Defines one onboarding session.
 * ============================================
 */

import { Installation } from "./installation";
import { OnboardingStep } from "./onboarding-step";

/**
 * Onboarding session.
 */
export interface Onboarding {

  /**
   * Session identifier.
   */
  id: string;

  /**
   * Installation.
   */
  installation: Installation;

  /**
   * Installation steps.
   */
  steps: OnboardingStep[];

  /**
   * Current step index.
   */
  currentStep: number;

  /**
   * Is onboarding completed.
   */
  completed: boolean;

}