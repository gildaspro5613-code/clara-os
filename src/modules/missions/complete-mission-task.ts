/**
 * ============================================
 * CLARA OS
 * Missions Module
 *
 * File : complete-mission-task.ts
 * Responsibility :
 * Apply the result of a Mission Task execution
 * to the Mission state.
 * ============================================
 */

import type { RuntimeResult } from "@/lib/runtime/runtime-result";

import type { Mission } from "./types/Mission";

/**
 * Applies a Runtime execution result to one Mission Task.
 *
 * A task is completed only when the Runtime execution
 * succeeds.
 */
export function completeMissionTask(
  mission: Mission,
  taskId: string,
  result: RuntimeResult,
): Mission {

  if (result.success === false) {
    return {
      ...mission,
      status: "blocked",
      lastAction:
        mission.lastAction,
      nextAction:
        mission.nextAction,
      result:
        result.message,
    };
  }

  const tasks = mission.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          completed: true,
        }
      : task,
  );

  const completedTasks =
    tasks.filter((task) => task.completed).length;

  const progress =
    tasks.length > 0
      ? Math.round(
          (completedTasks / tasks.length) * 100,
        )
      : 0;

  const completedTask =
    tasks.find((task) => task.id === taskId);

  const nextTask =
    tasks.find((task) => task.completed === false);

  return {
    ...mission,

    tasks,

    progress,

    status:
      progress === 100
        ? "completed"
        : "active",

    lastAction:
      completedTask?.title ?? mission.lastAction,

    nextAction:
      nextTask?.title,

    result:
      progress === 100
        ? result.message
        : mission.result,
  };
}
