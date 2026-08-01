/**
 * ============================================
 * CLARA OS
 * Knowledge Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Foundation Knowledge Module.
 * ============================================
 */

import {
  FOUNDATION_COMMUNICATION,
} from "./communication";

import {
  FOUNDATION_OBJECTIVES,
} from "./objectives";

import {
  FOUNDATION_PRINCIPLES,
} from "./principles";

import {
  FOUNDATION_VOCABULARY,
} from "./vocabulary";

/**
 * Foundation Knowledge Module.
 */
export const FOUNDATION_MODULE = {

  /**
   * Module identity.
   */
  id: "foundation",

  name: "Foundation",

  version: "1.0.0",

  description:
    "Universal professional knowledge shared across every Clara specialization.",

  /**
   * Module content.
   */
  principles: FOUNDATION_PRINCIPLES,

  objectives: FOUNDATION_OBJECTIVES,

  communication: FOUNDATION_COMMUNICATION,

  vocabulary: FOUNDATION_VOCABULARY,

} as const;