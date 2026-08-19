/**
 * ============================================
 * CLARA OS
 * Clara Navigation Action API
 * --------------------------------------------
 * File : route.ts
 * Responsibility :
 * Prepares a Waze navigation action for Clara.
 * ============================================
 */

import { NextResponse } from "next/server";

import { WazeEngine } from "@/lib/connectors/internal/waze/waze-engine";

interface NavigationRequest {
  destination?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NavigationRequest;
    const destination = body.destination?.trim();

    if (!destination) {
      return NextResponse.json(
        {
          success: false,
          message: "Destination manquante.",
        },
        { status: 400 },
      );
    }

    const engine = new WazeEngine();

    const result = await engine.navigate({
      destination,
    });

    if (!result.success || !result.url) {
      return NextResponse.json(
        result,
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      destination: result.destination,
      url: result.url,
      message: result.message,
      completedAt: result.completedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de préparer la navigation Waze.",
      },
      { status: 500 },
    );
  }
}
