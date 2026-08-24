/**
 * ============================================
 * CLARA OS
 * Missions API
 *
 * File : route.ts
 * Responsibility :
 * Resume a blocked Mission through Clara Core.
 * ============================================
 */

import { NextResponse } from "next/server";

import { getRuntime } from "@/lib/core/runtime";
import { EventType } from "@/types/event";

interface ResumeMissionRequest {
  missionId?: string;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as ResumeMissionRequest;

    const missionId = body.missionId?.trim();

    if (!missionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Mission manquante.",
        },
        { status: 400 },
      );
    }

    const session =
      await getRuntime().processEvent({
        id: crypto.randomUUID(),
        type: EventType.MISSION_RESUMED,
        source: "MISSION_UI",
        timestamp: new Date(),
        payload: {
          missionId,
        },
      });

    const mission = session.mission;

    if (!mission || mission.id !== missionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Mission introuvable ou impossible à reprendre.",
          mission: mission ?? null,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Mission reprise.",
      mission,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de reprendre la mission.",
      },
      { status: 500 },
    );
  }
}
