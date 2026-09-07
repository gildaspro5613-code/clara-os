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

let schemaReady: Promise<void> | null = null;

/**
 * Ensures the Missions persistence schema exists before it is used.
 *
 * Clara OS already lazily provisions persistence tables owned by newer
 * repositories (connections, credentials, approvals). Missions predates
 * that convention, so a fresh Neon/Vercel environment could reach the
 * mission store before clara_missions had ever been created.
 */
async function ensureMissionSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS clara_missions (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
}

/**
 * Persists one operational Mission.
 */
export async function saveMission(
  mission: Mission,
): Promise<void> {
  await ensureMissionSchema();
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
  await ensureMissionSchema();
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
  await ensureMissionSchema();
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
