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
   * Identifiant de la mission poursuivie lorsque
   * cette compréhension provient d'une exécution précédente.
   */
  missionId?: string;

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
   * Ordered action plan proposed by Clara.
   */
  actions: string[];

  /**
   * Optional next action suggested.
   *
   * This should correspond to the first actionable
   * step from the proposed plan.
   */
  nextAction?: string;

  /**
   * Perceived importance of the situation (0 → 1).
   */
  importance: number;

  /**
   * Perceived urgency of the situation (0 → 1).
   */
  urgency: number;

  /**
   * Potential impact of the situation (0 → 1).
   */
  impact: number;
}