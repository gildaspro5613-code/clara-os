// ============================================
// CLARA OS
// Missions Module
//
// File : mission-from-brain.ts
// Responsibility :
// Transform a Brain execution into a Mission.
// ============================================

import type { BrainDashboard } from "@/lib/brain/dashboard";
import { resolveTaskExecution } from "@/lib/brain/task-execution";
import {
  DecisionPriority,
  TaskStatus,
} from "@/types";

import type {
  Mission,
  MissionPriority,
  MissionTask,
} from "./types/Mission";

function mapPriority(
  priority: DecisionPriority
): MissionPriority {
  switch (priority) {
    case DecisionPriority.CRITICAL:
      return "critical";

    case DecisionPriority.HIGH:
      return "high";

    case DecisionPriority.LOW:
      return "low";

    case DecisionPriority.MEDIUM:
    default:
      return "medium";
  }
}

/**
 * Convert a Brain execution into an operational Mission.
 *
 * This function does not persist anything.
 * It only creates the Mission domain object.
 */
export function missionFromBrain(
  dashboard: BrainDashboard,
  previousMission?: Mission,
): Mission {
  const isContinuation =
    Boolean(
      previousMission &&
      dashboard.decision.missionId === previousMission.id,
    );

  const plannedTasks: MissionTask[] =
    dashboard.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      completed:
        task.status === TaskStatus.COMPLETED,
      execution: (() => {
        const execution =
          task.execution ??
          resolveTaskExecution(
            task.title,
            dashboard.decision,
            dashboard.sources,
          );

        return execution
          ? {
              ...execution,
              autonomous: true,
            }
          : undefined;
      })(),
    }));

  const tasks: MissionTask[] =
    isContinuation
      ? previousMission!.tasks
      : plannedTasks;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const progress =
    tasks.length > 0
      ? Math.round(
          (completedTasks / tasks.length) * 100
        )
      : 0;

  const nextTask = tasks.find(
    (task) => !task.completed
  );

  const nextAction =
    dashboard.decision.nextAction ??
    nextTask?.title;

  const completedTask = [...tasks]
    .reverse()
    .find((task) => task.completed);

  return {
    id:
      isContinuation && previousMission
        ? previousMission.id
        : dashboard.decision.missionId ??
          `mission-${dashboard.decision.id}`, 

    title: dashboard.decision.objective.title,

    objective: dashboard.decision.objective.description,

    context:
      dashboard.recommendation.rationale ??
      dashboard.understanding.summary,

    status: progress === 100
      ? "completed"
      : "active",

    priority: mapPriority(
      dashboard.decision.priority
    ),

    createdAt:
      dashboard.decision.createdAt,

    tasks,

    progress,

    nextAction: nextTask?.title,

    lastAction: completedTask?.title,

    result:
      progress === 100
        ? dashboard.recommendation.summary
        : undefined,
  };
}
