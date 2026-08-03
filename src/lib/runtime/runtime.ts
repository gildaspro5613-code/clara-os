/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : runtime.ts
 * Responsibility :
 * Defines one Clara runtime instance.
 * ============================================
 */

import { RuntimeContext } from "./runtime-context";

/**
 * Clara runtime.
 */
export interface Runtime {

  /**
   * Runtime identifier.
   */
  id: string;

  /**
   * Runtime name.
   */
  name: string;

  /**
   * Runtime context.
   */
  context: RuntimeContext;

  /**
   * Is runtime active.
   */
  active: boolean;

  /**
   * Startup date.
   */
  startedAt: Date;

}