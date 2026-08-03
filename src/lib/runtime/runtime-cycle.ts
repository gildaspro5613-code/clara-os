/**
 * ============================================
 * CLARA OS
 * Runtime Module
 * --------------------------------------------
 * File : runtime-cycle.ts
 * Responsibility :
 * Defines the execution lifecycle
 * of one Clara runtime cycle.
 * ============================================
 */

/**
 * Runtime lifecycle.
 */
export enum RuntimeCycle {

  /**
   * Event received.
   */
  RECEIVE = "receive",

  /**
   * Runtime context created.
   */
  CONTEXT = "context",

  /**
   * Brain reasoning.
   */
  THINK = "think",

  /**
   * Professional judgment.
   */
  DECIDE = "decide",

  /**
   * Result generation.
   */
  PUBLISH = "publish",

  /**
   * External actions.
   */
  EXECUTE = "execute",

  /**
   * Experience recording.
   */
  LEARN = "learn",

  /**
   * Runtime completed.
   */
  COMPLETE = "complete",

}