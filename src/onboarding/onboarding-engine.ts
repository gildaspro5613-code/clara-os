/**
 * ============================================
 * CLARA OS
 * Onboarding Module
 * --------------------------------------------
 * File : onboarding-engine.ts
 * Responsibility :
 * Executes one onboarding workflow.
 * ============================================
 */

import { Onboarding } from "./models/onboarding";
import { OnboardingRegistry } from "./registry/onboarding-registry";
import { OnboardingStep } from "./models/onboarding-step";

/**
 * Onboarding Engine.
 */
export class OnboardingEngine {

  /**
   * Constructor.
   */
  constructor(
    private readonly registry: OnboardingRegistry,
  ) {}

  /**
   * Starts one onboarding session.
   */
  public start(onboarding: Onboarding): Onboarding {

    return {
      ...onboarding,
      currentStep: 0,
      completed: false,
    };

  }

  /**
   * Returns all onboarding steps.
   */
  public getSteps(): OnboardingStep[] {

    return this.registry.steps;

  }

  /**
   * Returns the current step.
   */
  public getCurrentStep(
    onboarding: Onboarding,
  ): OnboardingStep | undefined {

    return onboarding.steps[onboarding.currentStep];

  }

  /**
   * Moves to the next step.
   */
  public next(
    onboarding: Onboarding,
  ): Onboarding {

    if (
      onboarding.currentStep <
      onboarding.steps.length - 1
    ) {

      return {
        ...onboarding,
        currentStep: onboarding.currentStep + 1,
      };

    }

    return {
      ...onboarding,
      completed: true,
    };

  }

  /**
   * Returns onboarding progress.
   */
  public progress(
    onboarding: Onboarding,
  ): number {

    if (onboarding.steps.length === 0) {

      return 0;

    }

    return (
      (onboarding.currentStep / onboarding.steps.length) * 100
    );

  }

}