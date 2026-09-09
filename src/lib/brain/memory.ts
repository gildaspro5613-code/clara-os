/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : memory.ts
 * Responsibility :
 * Loads the memory available to the Brain.
 * ============================================
 */

import { Context, Memory } from "@/types";
import type { Mission } from "@/modules/missions/types/Mission";

function isMission(value: unknown): value is Mission {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Mission>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.objective === "string" &&
    typeof candidate.status === "string" &&
    typeof candidate.progress === "number" &&
    Array.isArray(candidate.tasks)
  );
}

interface JournalMemoryItem {
  summary: string;
  details?: string;
}

function isJournalMemoryItem(value: unknown): value is JournalMemoryItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<JournalMemoryItem>;
  return typeof candidate.summary === "string";
}

/**
 * Load only memory that is relevant to the current cognitive context.
 *
 * Brain V2 deliberately keeps Journal and Memory separate:
 * - Journal records what happened.
 * - Memory exposes information worth reusing during reasoning.
 *
 * Durable cross-session memory persistence is intentionally not invented
 * here. Until a persistence repository is introduced, the resolved mission
 * and a small recent operational Journal window are the trustworthy sources
 * of reusable operational memory.
 */
export function loadMemory(context: Context): Memory {
  const memory: Memory = {
    shortTerm: [],
    longTerm: [],
    facts: [],
  };

  const metadata = context.metadata ?? {};
  const recentJournalActions = metadata.recentJournalActions;

  if (Array.isArray(recentJournalActions)) {
    recentJournalActions
      .filter(isJournalMemoryItem)
      .slice(-5)
      .forEach((entry) => {
        memory.shortTerm.push(
          `Action récente: ${entry.summary}${entry.details ? ` — ${entry.details}` : ""}`,
        );
      });
  }

  const mission = metadata.mission;

  if (!isMission(mission)) {
    return memory;
  }

  memory.shortTerm.push(
    `Mission active: ${mission.title}.`,
  );

  if (mission.lastAction) {
    memory.shortTerm.push(
      `Dernière action: ${mission.lastAction}`,
    );
  }

  if (mission.nextAction) {
    memory.shortTerm.push(
      `Prochaine action: ${mission.nextAction}`,
    );
  }

  memory.longTerm.push(
    `Objectif de la mission ${mission.title}: ${mission.objective}`,
  );

  memory.facts.push(
    `Mission ${mission.id}: statut ${mission.status}, priorité ${mission.priority}, progression ${mission.progress}%.`,
  );

  if (mission.result) {
    memory.facts.push(
      `Résultat actuel: ${mission.result}`,
    );
  }

  const completedTasks = mission.tasks.filter((task) => task.completed).length;
  memory.facts.push(
    `Tâches terminées: ${completedTasks}/${mission.tasks.length}.`,
  );

  return memory;
}
