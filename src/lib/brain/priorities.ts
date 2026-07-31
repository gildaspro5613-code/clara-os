// src/lib/brain/priorities.ts

import {
  BrainAction,
  BrainPriority,
} from "./types";

/**
 * Calcule les priorités à partir d'une liste d'actions.
 */
export function calculatePriorities(
  actions: BrainAction[]
): BrainPriority[] {
  return actions
    .map((action) => ({
      id: action.id,
      label: action.title,
      score: action.priority,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Retourne la priorité la plus importante.
 */
export function getTopPriority(
  priorities: BrainPriority[]
): BrainPriority | undefined {
  return priorities[0];
}

/**
 * Retourne uniquement les priorités supérieures ou égales
 * au score demandé.
 */
export function filterPriorities(
  priorities: BrainPriority[],
  minimumScore: number
): BrainPriority[] {
  return priorities.filter(
    (priority) => priority.score >= minimumScore
  );
}

/**
 * Recherche une priorité par son identifiant.
 */
export function findPriority(
  priorities: BrainPriority[],
  id: string
): BrainPriority | undefined {
  return priorities.find(
    (priority) => priority.id === id
  );
}