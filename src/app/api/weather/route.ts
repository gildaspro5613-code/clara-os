import { NextResponse } from "next/server";

import { WeatherEngine } from "@/lib/connectors/internal/weather/weather-engine";

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
        { status: result.code==="WEATHER_CONFIGURATION_MISSING"?503:502 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({success:false,code:"WEATHER_ENVIRONMENT_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
