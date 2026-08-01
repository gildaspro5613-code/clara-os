/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : scheduler.ts
 * Responsibility :
 * Schedules future executions.
 * ============================================
 */

export interface ScheduledTask {
  id: string;

  name: string;

  executeAt: Date;
}

/**
 * Creates a scheduled task.
 */
export function schedule(
  name: string,
  executeAt: Date
): ScheduledTask {

  return {
    id: crypto.randomUUID(),
    name,
    executeAt,
  };
}