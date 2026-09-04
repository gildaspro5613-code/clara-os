/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : planners.ts
 * Responsibility :
 * Build an execution plan from a decision.
 * ============================================
 */

import {
  Decision,
  Task,
  TaskStatus,
} from "@/types";

const planCopy = {
  fr: {
    decided: (action: string) => `Action décidée : ${action}`,
    execute: (summary: string) => `Exécuter la décision : ${summary}`,
  },
  en: {
    decided: (action: string) => `Decided action: ${action}`,
    execute: (summary: string) => `Execute decision: ${summary}`,
  },
  es: {
    decided: (action: string) => `Acción decidida: ${action}`,
    execute: (summary: string) => `Ejecutar la decisión: ${summary}`,
  },
  de: {
    decided: (action: string) => `Beschlossene Aktion: ${action}`,
    execute: (summary: string) => `Entscheidung ausführen: ${summary}`,
  },
  it: {
    decided: (action: string) => `Azione decisa: ${action}`,
    execute: (summary: string) => `Eseguire la decisione: ${summary}`,
  },
} as const;

function resolvePlanCopy(locale: string) {
  return planCopy[locale as keyof typeof planCopy] ?? planCopy.fr;
}

/**
 * Create the execution plan associated with
 * a decision.
 */
export function plan(decision: Decision, locale = "fr"): Task[] {
  const copy = resolvePlanCopy(locale);
  const actions = decision.actions
    .map((action) => action.trim())
    .filter(Boolean);

  if (actions.length === 0) {
    const action = decision.nextAction?.trim();

    return [
      {
        id: crypto.randomUUID(),
        decision,
        title: action || decision.summary,
        description: action
          ? copy.decided(action)
          : copy.execute(decision.summary),
        status: TaskStatus.TODO,
        createdAt: new Date(),
      },
    ];
  }

  return actions.map((action) => ({
    id: crypto.randomUUID(),
    decision,
    title: action,
    description: copy.decided(action),
    status: TaskStatus.TODO,
    createdAt: new Date(),
  }));
}
