import { NextResponse } from "next/server";

import { WeatherEngine } from "@/lib/connectors/internal/weather/weather-engine";

interface WeatherRequest {
  location?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location")?.trim();

    if (!location) {
      return NextResponse.json(
        {
          success: false,
          message: "Localisation manquante.",
        },
        { status: 400 },
      );
    }

    const engine = new WeatherEngine();

    const result = await engine.read({
      location,
    });

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /weather]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer la météo.",
      },
      { status: 500 },
    );
  }
}
