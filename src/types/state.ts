/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : state.ts
 * Responsibility :
 * Represents Clara's current operational state.
 * ============================================
 */

/**
 * États possibles de Clara.
 */
export enum State {
  /**
   * Clara est prête à travailler.
   */
  IDLE = "IDLE",

  /**
   * Clara analyse une situation.
   */
  THINKING = "THINKING",

  /**
   * Clara prépare un plan d'action.
   */
  PLANNING = "PLANNING",

  /**
   * Clara exécute une ou plusieurs tâches.
   */
  WORKING = "WORKING",

  /**
   * Clara attend un événement.
   */
  WAITING = "WAITING",

  /**
   * Clara est momentanément en erreur.
   */
  ERROR = "ERROR",
}