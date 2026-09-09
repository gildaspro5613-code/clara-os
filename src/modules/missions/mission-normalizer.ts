import type { Mission } from "./types/Mission";

export function cloneMission(mission: Mission): Mission {
  return {
    ...mission,
    createdAt: new Date(mission.createdAt),
    dueDate: mission.dueDate ? new Date(mission.dueDate) : undefined,
    tasks: mission.tasks.map((task) => ({ ...task })),
  };
}

/**
 * Derive mission progress and next action from the task state.
 * This function is provider-neutral and can be reused by both client cache
 * and durable server persistence.
 */
export function normalizeMission(mission: Mission): Mission {
  const completed = mission.tasks.filter((task) => task.completed).length;
  const progress = mission.tasks.length
    ? Math.round((completed / mission.tasks.length) * 100)
    : 0;
  const nextTask = mission.tasks.find((task) => !task.completed);

  return cloneMission({
    ...mission,
    progress,
    nextAction: nextTask?.title,
    status:
      mission.status === "active" && mission.tasks.length > 0 && progress === 100
        ? "completed"
        : mission.status,
  });
}
