/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Runtime module.
 * ============================================
 */

import { RuntimeEngine } from "./runtime-engine";

/**
 * Runtime module.
 */
export const RUNTIME_MODULE = {

  /**
   * Module identity.
   */
  id: "runtime",

  name: "Runtime",

  version: "1.0.0",

  description:
    "Coordinates Clara's complete execution lifecycle.",

  /**
   * Runtime engine.
   */
  engine: new RuntimeEngine(),

} as const;