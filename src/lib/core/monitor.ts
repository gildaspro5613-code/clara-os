/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : monitor.ts
 * Responsibility :
 * Monitors Clara's execution.
 * ============================================
 */

export interface MonitorSnapshot {
  timestamp: Date;
  message: string;
}

/**
 * Records one monitoring event.
 */
export function monitor(
  message: string
): MonitorSnapshot {

  return {
    timestamp: new Date(),
    message,
  };
}