import { sql } from "@/lib/core/store/database";
import { ensurePersistenceSchema } from "@/lib/persistence/ensure-schema";
import type { MissionRepository } from "./mission-repository";
import type { Mission, MissionTask } from "./types/Mission";

type MissionRow = {
  id: string;
  title: string;
  objective: string;
  context: string | null;
  status: Mission["status"];
  priority: Mission["priority"];
  created_at: string | Date;
  due_date: string | Date | null;
  tasks: MissionTask[] | string;
  progress: number;
  next_action: string | null;
  last_action: string | null;
  result: string | null;
};

function parseTasks(value: MissionRow["tasks"]): MissionTask[] {
  if (Array.isArray(value)) return value;

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as MissionTask[]) : [];
  } catch {
    return [];
  }
}

function toMission(row: MissionRow): Mission {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    context: row.context ?? undefined,
    status: row.status,
    priority: row.priority,
    createdAt: new Date(row.created_at),
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    tasks: parseTasks(row.tasks),
    progress: row.progress,
    nextAction: row.next_action ?? undefined,
    lastAction: row.last_action ?? undefined,
    result: row.result ?? undefined,
  };
}

/**
 * Durable, server-side MissionRepository backed by PostgreSQL/Neon.
 */
export class PostgresMissionRepository implements MissionRepository {
  async list(): Promise<Mission[]> {
    await ensurePersistenceSchema();

    const rows = (await sql`
      SELECT
        id, title, objective, context, status, priority,
        created_at, due_date, tasks, progress,
        next_action, last_action, result
      FROM missions
      ORDER BY updated_at DESC
    `) as MissionRow[];

    return rows.map(toMission);
  }

  async get(missionId: string): Promise<Mission | undefined> {
    await ensurePersistenceSchema();

    const rows = (await sql`
      SELECT
        id, title, objective, context, status, priority,
        created_at, due_date, tasks, progress,
        next_action, last_action, result
      FROM missions
      WHERE id = ${missionId}
      LIMIT 1
    `) as MissionRow[];

    return rows[0] ? toMission(rows[0]) : undefined;
  }

  async upsert(mission: Mission): Promise<Mission> {
    await ensurePersistenceSchema();

    const tasks = JSON.stringify(mission.tasks);

    const rows = (await sql`
      INSERT INTO missions (
        id, title, objective, context, status, priority,
        created_at, due_date, tasks, progress,
        next_action, last_action, result, updated_at
      ) VALUES (
        ${mission.id},
        ${mission.title},
        ${mission.objective},
        ${mission.context ?? null},
        ${mission.status},
        ${mission.priority},
        ${mission.createdAt.toISOString()},
        ${mission.dueDate?.toISOString() ?? null},
        ${tasks}::jsonb,
        ${mission.progress},
        ${mission.nextAction ?? null},
        ${mission.lastAction ?? null},
        ${mission.result ?? null},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        objective = EXCLUDED.objective,
        context = EXCLUDED.context,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        created_at = EXCLUDED.created_at,
        due_date = EXCLUDED.due_date,
        tasks = EXCLUDED.tasks,
        progress = EXCLUDED.progress,
        next_action = EXCLUDED.next_action,
        last_action = EXCLUDED.last_action,
        result = EXCLUDED.result,
        updated_at = NOW()
      RETURNING
        id, title, objective, context, status, priority,
        created_at, due_date, tasks, progress,
        next_action, last_action, result
    `) as MissionRow[];

    return toMission(rows[0]);
  }
}
