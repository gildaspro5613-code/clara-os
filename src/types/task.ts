/**
 * ============================================
 * CLARA OS
 * Types Module
 * --------------------------------------------
 * File : task.ts
 * Responsibility :
 * Represents a unit of work to be completed
 * by Clara.
 * ============================================
 */

import { Decision } from "./decision";
import type { ExecutionDirective } from "@/lib/runtime/execution-directive";

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Task {
  id: string;
  decision: Decision;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: Date;
  dueAt?: Date;
  completedAt?: Date;

  /**
   * Optional explicit execution metadata.
   * Absence means the task is cognitive/planning-only and MUST NOT execute.
   */
  execution?: ExecutionDirective;
}
