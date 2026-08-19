/**
 * ============================================
 * CLARA OS
 * Missions Module
 *
 * File : autonomy-gate.ts
 * Responsibility :
 * Determines whether a Mission Task is
 * explicitly authorized for autonomous execution.
 * ============================================
 */

import type { MissionTask } from "./types/Mission";

/**
 * Returns true only when a task is explicitly
 * authorized for autonomous execution.
 *
 * V1 is intentionally conservative:
 * - completed tasks cannot execute;
 * - tasks without an execution contract cannot execute;
 * - autonomous execution must be explicitly enabled.
 */
export function canExecuteAutonomously(
  task: MissionTask,
): boolean {
  if (task.completed) {
    return false;
  }

  return task.execution?.autonomous === true;
}
