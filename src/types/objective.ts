/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * Type : Objective
 * Responsibility :
 * Represent a goal Clara wants to achieve.
 * ============================================
 */

export interface Objective {
  // Identifiant unique
  id: string;

  // Nom de l'objectif
  title: string;

  // Description de l'objectif
  description: string;

  // Priorité de l'objectif
  priority: number;

  // Objectif atteint ?
  completed: boolean;
}