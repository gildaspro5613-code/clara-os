/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : recommendation.ts
 * Responsibility :
 * Represents a recommendation produced by
 * Clara's Brain.
 * ============================================
 */

import { Decision } from "./decision";

/**
 * Niveau de confiance d'une recommandation.
 */
export enum RecommendationConfidence {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

/**
 * Représente une recommandation produite
 * par Clara.
 */
export interface Recommendation {
  /**
   * Identifiant unique.
   */
  id: string;

  /**
   * Décision à l'origine de cette recommandation.
   */
  decision: Decision;

  /**
   * Résumé de la recommandation.
   */
  summary: string;

  /**
   * Explication éventuelle.
   */
  rationale?: string;

  /**
   * Niveau de confiance.
   */
  confidence: RecommendationConfidence;

  /**
   * Date de création.
   */
  createdAt: Date;
}