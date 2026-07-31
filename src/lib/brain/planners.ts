/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : planners.ts
 * Responsibility :
 * Builds executable mission plans from
 * prioritized actions.
 * ============================================
 */

import type { Priority } from "./priorities";

export interface PlanStep {
  id: string;

  title: string;

  description?: string;

  capability: string;

  status: "pending" | "running" | "completed";

  order: number;
}

export interface MissionPlan {
  id: string;

  title: string;

  priority: Priority;

  steps: readonly PlanStep[];

  createdAt: Date;
}

/**
 * Builds mission plans from priorities.
 */
export async function plan(
  priorities: readonly Priority[]
): Promise<readonly MissionPlan[]> {
  return Object.freeze(
    priorities.map((priority) =>
      Object.freeze({
        id: priority.id,

        title: priority.title,

        priority,

        steps: buildSteps(priority),

        createdAt: new Date(),
      })
    )
  );
}

/**
 * Builds execution steps for one priority.
 */
function buildSteps(priority: Priority): readonly PlanStep[] {
  switch (priority.category) {
    case "communication":
      return Object.freeze([
        step(1, "Analyser le contexte", "context"),
        step(2, "Préparer le message", "communication"),
        step(3, "Envoyer le message", "email"),
      ]);

    case "crm":
      return Object.freeze([
        step(1, "Ouvrir le CRM", "crm"),
        step(2, "Mettre à jour la fiche", "crm"),
        step(3, "Planifier le suivi", "calendar"),
      ]);

    case "development":
      return Object.freeze([
        step(1, "Analyser le dépôt GitHub", "github"),
        step(2, "Préparer les modifications", "codespaces"),
        step(3, "Créer la Pull Request", "github"),
      ]);

    default:
      return Object.freeze([
        step(1, "Analyser la mission", "brain"),
        step(2, "Préparer les actions", "planner"),
      ]);
  }
}

/**
 * Creates one execution step.
 */
function step(
  order: number,
  title: string,
  capability: string,
  description?: string
): PlanStep {
  return Object.freeze({
    id: crypto.randomUUID(),

    title,

    description,

    capability,

    status: "pending",

    order,
  });
}