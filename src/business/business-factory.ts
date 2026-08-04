/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : business-factory.ts
 * Responsibility :
 * Creates one Business Engine.
 * ============================================
 */

import { BusinessEngine } from "./business-engine";
import { BusinessRegistry } from "./registry/business-registry";

/**
 * Business Factory.
 */
export class BusinessFactory {

  /**
   * Creates one Business Engine.
   */
  public static create(): BusinessEngine {

    const registry: BusinessRegistry = {

      applications: [],

      offers: [],

      pricing: [],

      company: {

        name: "Melodie Digital",

        website: "",

        email: "",

        phone: "",

        mission: "",

        vision: "",

      },

      branding: {

        companyName: "Melodie Digital",

        primaryColor: "",

        secondaryColor: "",

        logo: "",

        slogan: "",

      },

      distribution: [],

      documents: [],

    };

    return new BusinessEngine(registry);

  }

}