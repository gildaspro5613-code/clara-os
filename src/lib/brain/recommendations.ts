/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : recommendations.ts
 * Responsibility :
 * Build a recommendation from a decision.
 * ============================================
 */

import {
  Decision,
  DecisionPriority,
  Recommendation,
  RecommendationConfidence,
} from "@/types";

const recommendationCopy = {
  fr: {
    priorities: { low: "faible", medium: "moyenne", high: "haute", critical: "critique" },
    summary: (priority: string, action: string) => `Priorité ${priority}. Commencer par : ${action}`,
    rationaleOne: (priority: string) => `La décision est classée en priorité ${priority}.`,
    rationaleMany: (priority: string, count: number) => `La décision est classée en priorité ${priority} et comporte ${count} actions planifiées.`,
  },
  en: {
    priorities: { low: "low", medium: "medium", high: "high", critical: "critical" },
    summary: (priority: string, action: string) => `${priority[0].toUpperCase()}${priority.slice(1)} priority. Start with: ${action}`,
    rationaleOne: (priority: string) => `The decision is classified as ${priority} priority.`,
    rationaleMany: (priority: string, count: number) => `The decision is classified as ${priority} priority and includes ${count} planned actions.`,
  },
  es: {
    priorities: { low: "baja", medium: "media", high: "alta", critical: "crítica" },
    summary: (priority: string, action: string) => `Prioridad ${priority}. Empezar por: ${action}`,
    rationaleOne: (priority: string) => `La decisión está clasificada con prioridad ${priority}.`,
    rationaleMany: (priority: string, count: number) => `La decisión está clasificada con prioridad ${priority} e incluye ${count} acciones planificadas.`,
  },
  de: {
    priorities: { low: "niedrig", medium: "mittel", high: "hoch", critical: "kritisch" },
    summary: (priority: string, action: string) => `Priorität ${priority}. Beginnen mit: ${action}`,
    rationaleOne: (priority: string) => `Die Entscheidung ist mit Priorität ${priority} eingestuft.`,
    rationaleMany: (priority: string, count: number) => `Die Entscheidung ist mit Priorität ${priority} eingestuft und umfasst ${count} geplante Aktionen.`,
  },
  it: {
    priorities: { low: "bassa", medium: "media", high: "alta", critical: "critica" },
    summary: (priority: string, action: string) => `Priorità ${priority}. Iniziare da: ${action}`,
    rationaleOne: (priority: string) => `La decisione è classificata con priorità ${priority}.`,
    rationaleMany: (priority: string, count: number) => `La decisione è classificata con priorità ${priority} e comprende ${count} azioni pianificate.`,
  },
} as const;

function resolveRecommendationCopy(locale: string) {
  return recommendationCopy[locale as keyof typeof recommendationCopy] ?? recommendationCopy.fr;
}

/**
 * Produce a recommendation from a decision.
 */
export function recommend(
  decision: Decision,
  locale = "fr",
): Recommendation {
  const copy = resolveRecommendationCopy(locale);
  const nextAction = decision.nextAction?.trim();

  const priorityKey = {
    [DecisionPriority.LOW]: "low",
    [DecisionPriority.MEDIUM]: "medium",
    [DecisionPriority.HIGH]: "high",
    [DecisionPriority.CRITICAL]: "critical",
  }[decision.priority] as keyof typeof copy.priorities;

  const priorityLabel = copy.priorities[priorityKey];

  const summary = nextAction
    ? copy.summary(priorityLabel, nextAction)
    : decision.summary;

  const rationale = decision.actions.length > 1
    ? copy.rationaleMany(priorityLabel, decision.actions.length)
    : copy.rationaleOne(priorityLabel);

  return {
    id: crypto.randomUUID(),
    decision,
    summary,
    rationale,
    confidence: RecommendationConfidence.HIGH,
    createdAt: new Date(),
  };
}
