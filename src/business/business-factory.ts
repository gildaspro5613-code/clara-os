/**
 * ============================================
 * CLARA OS
 * Business Module
 * --------------------------------------------
 * File : business-factory.ts
 * Responsibility :
 * Creates the Business Engine.
 * ============================================
 */

import { BusinessEngine } from "./business-engine";
import { BusinessRegistry } from "./registry/business-registry";

import { CLARA_ESSENTIALS } from "./applications/clara-essentials";

/**
 * Business factory.
 */
export class BusinessFactory {

  /**
   * Creates the business engine.
   */
  public static create(): BusinessEngine {

    const registry: BusinessRegistry = {

      applications: [

        CLARA_ESSENTIALS,

      ],

      offers: [

        CLARA_ESSENTIALS.offer,

      ],

      pricing: [],

      company: {

        name: "Melodie Digital",

        website: "",

        email: "",

        phone: "",

        mission: "",

        vision: "",

      },

      branding: CLARA_ESSENTIALS.branding,

      distribution: [],

      documents: [],

    };

    return new BusinessEngine(

      registry,

    );

  }

}