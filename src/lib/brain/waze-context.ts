/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : waze-context.ts
 * Responsibility :
 * Provides navigation context to Clara's Brain.
 * ============================================
 */

import { WazeEngine } from "@/lib/connectors/internal/waze/waze-engine";
import type { WazeResult } from "@/lib/connectors/internal/waze/waze-result";

export interface BrainWazeContext {
  available: boolean;
  source: "waze";
  destination: string;
  result: WazeResult;
  error?: string;
}

export function summarizeWazeContext(
  context: BrainWazeContext,
): string {
  const lines = [
    `Waze disponible : ${context.available ? "oui" : "non"}.`,
    `Destination : ${context.destination}.`,
  ];

  if (context.error) {
    lines.push(`Erreur : ${context.error}`);
  }

  if (context.result.success && context.result.url) {
    lines.push(`Navigation : ${context.result.url}`);
  }

  if (context.result.message) {
    lines.push(`Statut : ${context.result.message}`);
  }

  return lines.join("\n");
}

export async function buildWazeContext(
  _event: {
    type: string;
    payload?: unknown;
  },
  _now: Date,
  destination: string,
): Promise<BrainWazeContext> {
  try {
    const engine = new WazeEngine();

    const result = await engine.navigate({
      destination,
    });

    return {
      available: result.success,
      source: "waze",
      destination,
      result,
      ...(result.success
        ? {}
        : { error: result.message ?? "Navigation indisponible." }),
    };
  } catch (error) {
    return {
      available: false,
      source: "waze",
      destination,
      result: {
        success: false,
        destination,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de préparer la navigation Waze.",
        completedAt: new Date(),
      },
      error:
        error instanceof Error
          ? error.message
          : "Impossible de préparer la navigation Waze.",
    };
  }
}
