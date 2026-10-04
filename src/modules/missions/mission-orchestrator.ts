import type { Mission, MissionPriority } from "./types/Mission";

export interface MissionOrchestration {
  current: Mission | null;
  active: Mission[];
  blocked: Mission[];
  planned: Mission[];
  interventionRequired: Mission[];
}

const priorityRank: Record<MissionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function dueTime(mission: Mission): number {
  return mission.dueDate ? mission.dueDate.getTime() : Number.POSITIVE_INFINITY;
}

function createdTime(mission: Mission): number {
  return mission.createdAt.getTime();
}

function compareOperationalPriority(a: Mission, b: Mission): number {
  const priorityDelta = priorityRank[b.priority] - priorityRank[a.priority];
  if (priorityDelta !== 0) return priorityDelta;

  const dueDelta = dueTime(a) - dueTime(b);
  if (dueDelta !== 0) return dueDelta;

  return createdTime(a) - createdTime(b);
}

function requiresIntervention(mission: Mission): boolean {
  if (mission.status === "blocked") return true;

  const nextPendingTask = mission.tasks.find((task) => !task.completed);
  return Boolean(nextPendingTask?.execution && !nextPendingTask.execution.autonomous);
}

/**
 * Produces a deterministic operational view without mutating mission state.
 *
 * V1 deliberately keeps persistence and orchestration separate: clara_missions
 * remains the source of truth while the cockpit receives a ranked view of all
 * concurrent work. A mission is never discarded merely because another one is
 * selected as the current focus.
 */
export function orchestrateMissions(missions: Mission[]): MissionOrchestration {
  const active = missions
    .filter((mission) => mission.status === "active")
    .sort(compareOperationalPriority);
  const blocked = missions
    .filter((mission) => mission.status === "blocked")
    .sort(compareOperationalPriority);
  const planned = missions
    .filter((mission) => mission.status === "planned")
    .sort(compareOperationalPriority);
  const interventionRequired = [...active, ...blocked]
    .filter(requiresIntervention)
    .sort(compareOperationalPriority);

  return {
    current: active[0] ?? blocked[0] ?? planned[0] ?? null,
    active,
    blocked,
    planned,
    interventionRequired,
  };
}
