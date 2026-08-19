/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : weather-context.ts
 * Responsibility :
 * Provides weather context to Clara's Brain.
 * ============================================
 */

import { WeatherEngine } from "@/lib/connectors/internal/weather/weather-engine";
import type { WeatherResult } from "@/lib/connectors/internal/weather/weather-result";

export interface BrainWeatherContext {
  available: boolean;
  source: "weather";
  location: string;
  result: WeatherResult;
  error?: string;
}

export function summarizeWeatherContext(
  context: BrainWeatherContext,
): string {
  const lines = [
    `Météo disponible : ${context.available ? "oui" : "non"}.`,
    `Localisation : ${context.location}.`,
  ];

  if (context.error) {
    lines.push(`Erreur : ${context.error}`);
  }

  if (context.result.success) {
    if (context.result.temperatureC !== undefined) {
      lines.push(`Température : ${context.result.temperatureC}°C.`);
    }

    if (context.result.condition) {
      lines.push(`Conditions : ${context.result.condition}.`);
    }

    if (context.result.updatedAt) {
      lines.push(
        `Mise à jour : ${context.result.updatedAt.toISOString()}.`,
      );
    }
  }

  return lines.join("\n");
}

export async function buildWeatherContext(
  _event: {
    type: string;
    payload?: unknown;
  },
  _now: Date,
  location = "Angers",
): Promise<BrainWeatherContext> {
  try {
    const engine = new WeatherEngine();

    const result = await engine.read({
      location,
    });

    return {
      available: result.success,
      source: "weather",
      location,
      result,
      ...(result.success
        ? {}
        : { error: result.message ?? "Météo indisponible." }),
    };
  } catch (error) {
    return {
      available: false,
      source: "weather",
      location,
      result: {
        success: false,
        location,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de récupérer la météo.",
        completedAt: new Date(),
      },
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer la météo.",
    };
  }
}
