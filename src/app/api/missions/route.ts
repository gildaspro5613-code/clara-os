import { NextRequest, NextResponse } from "next/server";

import { missionsMock } from "@/modules/missions/data/missions.mock";
import { normalizeMission } from "@/modules/missions/mission-normalizer";
import { PostgresMissionRepository } from "@/modules/missions/postgres-mission-repository";
import type {
  Mission,
  MissionPriority,
  MissionStatus,
  MissionTask,
} from "@/modules/missions/types/Mission";

const repository = new PostgresMissionRepository();

const STATUSES: MissionStatus[] = [
  "planned",
  "active",
  "blocked",
  "completed",
  "cancelled",
];

const PRIORITIES: MissionPriority[] = ["low", "medium", "high", "critical"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseTasks(value: unknown): MissionTask[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const tasks: MissionTask[] = [];
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.completed !== "boolean"
    ) {
      return undefined;
    }

    tasks.push({
      id: item.id,
      title: item.title,
      completed: item.completed,
    });
  }

  return tasks;
}

function parseMission(value: unknown): Mission | undefined {
  if (!isRecord(value)) return undefined;

  const tasks = parseTasks(value.tasks);
  if (!tasks) return undefined;

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.objective !== "string" ||
    typeof value.status !== "string" ||
    !STATUSES.includes(value.status as MissionStatus) ||
    typeof value.priority !== "string" ||
    !PRIORITIES.includes(value.priority as MissionPriority) ||
    typeof value.createdAt !== "string"
  ) {
    return undefined;
  }

  const createdAt = new Date(value.createdAt);
  const dueDate = typeof value.dueDate === "string" ? new Date(value.dueDate) : undefined;

  if (Number.isNaN(createdAt.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) {
    return undefined;
  }

  return normalizeMission({
    id: value.id,
    title: value.title,
    objective: value.objective,
    context: typeof value.context === "string" ? value.context : undefined,
    status: value.status as MissionStatus,
    priority: value.priority as MissionPriority,
    createdAt,
    dueDate,
    tasks,
    progress: typeof value.progress === "number" ? value.progress : 0,
    nextAction: typeof value.nextAction === "string" ? value.nextAction : undefined,
    lastAction: typeof value.lastAction === "string" ? value.lastAction : undefined,
    result: typeof value.result === "string" ? value.result : undefined,
  });
}

async function ensureSeeded(): Promise<Mission[]> {
  const existing = await repository.list();
  if (existing.length > 0) return existing;

  for (const mission of missionsMock) {
    await repository.upsert(normalizeMission(mission));
  }

  return repository.list();
}

export async function GET(): Promise<NextResponse> {
  try {
    const missions = await ensureSeeded();
    return NextResponse.json({ success: true, missions });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        missions: [],
        error: error instanceof Error ? error.message : "Unable to load missions.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const mission = parseMission(isRecord(body) ? body.mission : undefined);
  if (!mission) {
    return NextResponse.json(
      { success: false, error: "Invalid mission payload." },
      { status: 400 },
    );
  }

  try {
    const saved = await repository.upsert(mission);
    return NextResponse.json({ success: true, mission: saved });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to save mission.",
      },
      { status: 500 },
    );
  }
}
