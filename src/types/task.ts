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

/**
 * État d'une tâche.
 */
export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

/**
 * Représente une tâche créée par Clara.
 */
export interface Task {
  /**
   * Identifiant unique.
   */
  id: string;

  /**
   * Décision à l'origine de cette tâche.
   */
  decision: Decision;

  /**
   * Nom de la tâche.
   */
  title: string;

  /**
   * Description détaillée.
   */
  description?: string;

  /**
   * État actuel.
   */
  status: TaskStatus;

  /**
   * Date de création.
   */
  createdAt: Date;

  /**
   * Date d'échéance éventuelle.
   */
  dueAt?: Date;

  /**
   * Date de fin.
   */
  completedAt?: Date;
}