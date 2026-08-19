import { NextResponse } from "next/server";

import { WazeEngine } from "@/lib/connectors/internal/waze/waze-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination")?.trim();

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

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /waze]", error);

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
