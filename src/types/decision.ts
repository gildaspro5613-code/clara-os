/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : decision.ts
 * Responsibility :
 * Represents a decision taken by Clara after
 * analysing a situation.
 * ============================================
 */

import { Objective } from "./objective";

/**
 * Niveau de priorité d'une décision.
 */
export enum DecisionPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Représente une décision prise par Clara.
 */
export interface Decision {
  /**
   * Identifiant de la mission poursuivie lorsque
   * cette compréhension provient d'une exécution précédente.
   */
  missionId?: string;

  /**
   * Identifiant unique.
   */
  id: string;

  /**
   * Objectif auquel répond cette décision.
   */
  objective: Objective;

  /**
   * Description de la décision.
   */
  summary: string;

  /**
   * Niveau de priorité.
   */
  priority: DecisionPriority;

  /**
   * Plan d'actions ordonné issu du raisonnement de Clara.
   */
  actions: string[];

  /**
   * Prochaine action issue du raisonnement de Clara.
   *
   * Correspond à la première action du plan.
   */
  nextAction?: string;

  /**
   * Date de création.
   */
  createdAt: Date;
}