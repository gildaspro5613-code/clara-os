/**
 * ============================================
 * CLARA OS
 * Onboarding Module
 * --------------------------------------------
 * File : onboarding-registry.ts
 * Responsibility :
 * Central registry for onboarding templates.
 * ============================================
 */

import { OnboardingStep } from "../models/onboarding-step";

/**
 * Onboarding registry.
 */
export interface OnboardingRegistry {

  /**
   * Available onboarding steps.
   */
  steps: OnboardingStep[];

}