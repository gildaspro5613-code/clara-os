/**
 * ============================================
 * CLARA OS
 * Missions Module
 *
 * File : mission-store.ts
 * Responsibility :
 * Persists operational Missions independently
 * from the Clara session.
 * ============================================
 */

import type { Mission } from "./types/Mission";

import { sql } from "@/lib/core/store/database";

/**
 * Persists one operational Mission.
 */
export async function saveMission(
  mission: Mission,
): Promise<void> {
  await sql`
    INSERT INTO clara_missions (
      id,
      data,
      updated_at
    )
    VALUES (
      ${mission.id},
      ${JSON.stringify(mission)},
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      data = EXCLUDED.data,
      updated_at = NOW()
  `;
}

/**
 * Loads all operational Missions.
 */
export async function loadMissions(): Promise<Mission[]> {
  const rows = await sql`
    SELECT data
    FROM clara_missions
    ORDER BY updated_at DESC
  `;

  const missionRows =
    rows as Array<{ data: Mission }>;

  return missionRows.map(({ data }) => ({
    ...data,
    createdAt: new Date(data.createdAt),
    dueDate: data.dueDate
      ? new Date(data.dueDate)
      : undefined,
    tasks: data.tasks.map((task) => ({
      ...task,
    })),
  }));
}

/**
 * Loads one operational Mission.
 */
export async function loadMission(
  missionId: string,
): Promise<Mission | null> {
  const rows = await sql`
    SELECT data
    FROM clara_missions
    WHERE id = ${missionId}
    LIMIT 1
  `;

  const missionRows =
    rows as Array<{ data: Mission }>;

  if (!missionRows.length) {
    return null;
  }

  const parsed =
    missionRows[0].data as Mission;

  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    dueDate: parsed.dueDate
      ? new Date(parsed.dueDate)
      : undefined,
    tasks: parsed.tasks.map((task) => ({
      ...task,
    })),
  };
}
