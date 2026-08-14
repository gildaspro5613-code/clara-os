/**
 * ============================================
 * CLARA OS
 * Missions API
 *
 * File : route.ts
 * Responsibility :
 * Execute one executable Mission Task
 * through Clara Runtime.
 * ============================================
 */

import { NextResponse } from "next/server";

import { executeMissionTask } from "@/modules/missions/execute-mission-task";
import { completeMissionTask } from "@/modules/missions/complete-mission-task";
import type { Mission } from "@/modules/missions/types/Mission";

interface ExecuteMissionRequest {
  mission?: Mission;
  taskId?: string;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as ExecuteMissionRequest;

    const mission = body.mission;
    const taskId = body.taskId?.trim();

    if (!mission || !taskId) {
      return NextResponse.json(
        {
          success: false,
          message: "Mission ou tâche manquante.",
        },
        { status: 400 },
      );
    }

    const task =
      mission.tasks.find(
        (candidate) => candidate.id === taskId,
      );

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          message: "Tâche introuvable dans la mission.",
        },
        { status: 404 },
      );
    }

    const result =
      await executeMissionTask(task);

    const updatedMission =
      completeMissionTask(
        mission,
        taskId,
        result,
      );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      mission: updatedMission,
      outputs: result.outputs,
      completedAt: result.completedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'exécuter la tâche.",
      },
      { status: 500 },
    );
  }
}
