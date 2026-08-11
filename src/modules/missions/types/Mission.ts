// ============================================
// CLARA OS
// Missions Module
//
// File : Mission.ts
// Responsibility :
// Official mission data model.
// ============================================

export type MissionStatus =
  | "planned"
  | "active"
  | "blocked"
  | "completed"
  | "cancelled";

export type MissionPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface MissionTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Mission {
  id: string;

  title: string;
  objective: string;
  context?: string;

  status: MissionStatus;
  priority: MissionPriority;

  createdAt: Date;
  dueDate?: Date;

  tasks: MissionTask[];

  progress: number;

  nextAction?: string;
  lastAction?: string;
  result?: string;
}
