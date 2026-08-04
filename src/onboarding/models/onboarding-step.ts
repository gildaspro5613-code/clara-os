/**
 * ============================================
 * CLARA OS
 * Onboarding Module
 * --------------------------------------------
 * File : onboarding-step.ts
 * Responsibility :
 * Defines one onboarding step.
 * ============================================
 */

/**
 * Onboarding step.
 */
export interface OnboardingStep {

  /**
   * Step identifier.
   */
  id: string;

  /**
   * Step name.
   */
  name: string;

  /**
   * Step description.
   */
  description: string;

  /**
   * Is completed.
   */
  completed: boolean;

}