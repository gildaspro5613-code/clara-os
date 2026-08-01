/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : understanding.ts
 * Responsibility :
 * Represents Clara's interpretation of a
 * situation before making a decision.
 * ============================================
 */

export interface Understanding {
  /**
   * Main intent detected.
   */
  intent: string;

  /**
   * Summary of the situation.
   */
  summary: string;

  /**
   * Confidence score (0 → 1).
   */
  confidence: number;

  /**
   * Relevant entities detected.
   */
  entities: string[];

  /**
   * Optional next action suggested.
   */
  nextAction?: string;
}