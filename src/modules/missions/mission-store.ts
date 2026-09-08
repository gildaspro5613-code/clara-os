// ============================================
// CLARA OS
// Missions Module
//
// File : mission-store.ts
// Responsibility :
// Canonical in-process mission state for Brain V2.
// UI persistence adapters can synchronize with this store without
// making a page or widget the source of truth.
// ============================================

import type { Mission } from "./types/Mission";

type MissionListener = (missions: readonly Mission[]) => void;

function cloneMission(mission: Mission): Mission {
  return {
    ...mission,
    tasks: mission.tasks.map((task) => ({ ...task })),
  };
}

class MissionStore {
  private missions = new Map<string, Mission>();
  private listeners = new Set<MissionListener>();

  list(): Mission[] {
    return Array.from(this.missions.values(), cloneMission);
  }

  get(missionId: string): Mission | undefined {
    const mission = this.missions.get(missionId);
    return mission ? cloneMission(mission) : undefined;
  }

  seed(missions: readonly Mission[]): void {
    if (this.missions.size > 0) return;

    missions.forEach((mission) => {
      this.missions.set(mission.id, cloneMission(mission));
    });

    this.emit();
  }

  upsert(mission: Mission): Mission {
    const normalized = normalizeMission(mission);
    this.missions.set(normalized.id, normalized);
    this.emit();
    return cloneMission(normalized);
  }

  subscribe(listener: MissionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.list();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

function normalizeMission(mission: Mission): Mission {
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

export const missionStore = new MissionStore();
