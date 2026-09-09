// ============================================
// CLARA OS
// Missions Module
//
// File : mission-store.ts
// Responsibility :
// Client-side mission cache for Brain V2.
// Durable server persistence remains the source of truth.
// ============================================

import { cloneMission, normalizeMission } from "./mission-normalizer";
import type { Mission } from "./types/Mission";

type MissionListener = (missions: readonly Mission[]) => void;

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

  replace(missions: readonly Mission[]): void {
    this.missions.clear();
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

export const missionStore = new MissionStore();
