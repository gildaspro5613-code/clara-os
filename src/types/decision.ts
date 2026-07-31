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
   * Date de création.
   */
  createdAt: Date;
}