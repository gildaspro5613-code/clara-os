// ============================================
// CLARA OS
// Missions Module
//
// File : mission-repository.ts
// Responsibility :
// Defines the persistence boundary for Mission state.
// ============================================

import type { Mission } from "./types/Mission";

/**
 * Server-side persistence contract for Mission state.
 *
 * Implementations may use a durable database, but callers must not depend
 * on the storage provider. This boundary is intentionally asynchronous so
 * it can safely back API/server workflows across Vercel instances.
 */
export interface MissionRepository {
  list(): Promise<Mission[]>;
  get(missionId: string): Promise<Mission | undefined>;
  upsert(mission: Mission): Promise<Mission>;
}
