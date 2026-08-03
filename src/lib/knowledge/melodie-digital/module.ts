/**
 * ============================================
 * CLARA OS
 * Knowledge Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Melodie Digital
 * Knowledge Module.
 * ============================================
 */

import {
  MELODIE_DIGITAL_IDENTITY,
} from "./identity";

import {
  MELODIE_DIGITAL_VISION,
} from "./vision";

import {
  MELODIE_DIGITAL_VALUES,
} from "./values";

import {
  MELODIE_DIGITAL_OFFERS,
} from "./offers";

/**
 * Melodie Digital Knowledge Module.
 */
export const MELODIE_DIGITAL_MODULE = {

  /**
   * Module identity.
   */
  id: "melodie-digital",

  name: "Melodie Digital",

  version: "1.0.0",

  description:
    "Business knowledge describing Melodie Digital.",

  /**
   * Module content.
   */
  identity: MELODIE_DIGITAL_IDENTITY,

  vision: MELODIE_DIGITAL_VISION,

  values: MELODIE_DIGITAL_VALUES,

  offers: MELODIE_DIGITAL_OFFERS,

} as const;