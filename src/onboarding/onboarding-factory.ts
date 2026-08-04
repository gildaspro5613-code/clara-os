/**
 * ============================================
 * CLARA OS
 * Onboarding Module
 * --------------------------------------------
 * File : onboarding-factory.ts
 * Responsibility :
 * Creates one Onboarding Engine.
 * ============================================
 */

import { OnboardingEngine } from "./onboarding-engine";
import { OnboardingRegistry } from "./registry/onboarding-registry";

export class OnboardingFactory {

  public static create(): OnboardingEngine {

    const registry: OnboardingRegistry = {

      steps: [],

    };

    return new OnboardingEngine(registry);

  }

}