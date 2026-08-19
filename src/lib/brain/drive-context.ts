/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * File : drive-context.ts
 * Responsibility :
 * Provides Google Drive context to Clara's Brain.
 * ============================================
 */

import { GoogleDriveEngine } from "@/lib/connectors/internal/google/drive/google-drive-engine";

export interface BrainDriveFile {
  id: string;
  name: string;
  mimeType?: string;
  url?: string;
}

export interface BrainDriveContext {
  available: boolean;
  source: "google-drive";
  query: string;
  files: BrainDriveFile[];
  error?: string;
}

export function summarizeDriveContext(
  context: BrainDriveContext,
): string {
  const lines = [
    `Google Drive disponible : ${context.available ? "oui" : "non"}.`,
    `Recherche : ${context.query || "fichiers récents"}.`,
  ];

  if (context.error) {
    lines.push(`Erreur : ${context.error}`);
  }

  if (context.files.length === 0) {
    lines.push("Aucun fichier trouvé.");
    return lines.join("\n");
  }

  lines.push("Fichiers trouvés :");

  for (const file of context.files) {
    lines.push(
      [
        `- ${file.name}`,
        file.mimeType ? `type: ${file.mimeType}` : "",
        file.url ? `url: ${file.url}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  return lines.join("\n");
}

export async function buildDriveContext(
  _event: {
    type: string;
    payload?: unknown;
  },
  _now: Date,
  query: string,
): Promise<BrainDriveContext> {
  try {
    const engine = new GoogleDriveEngine();

    const normalizedQuery = query.trim();

    const driveQuery = normalizedQuery
      ? `name contains '${normalizedQuery.replace(/'/g, "\\'")}' and trashed = false`
      : "trashed = false";

    const result = await engine.list({
      pageSize: 20,
      query: driveQuery,
    });

    return {
      available: true,
      source: "google-drive",
      query: normalizedQuery,
      files: result.files.map((file) => ({
        id: file.fileId,
        name: file.fileName,
        mimeType: file.mimeType,
        url: file.url,
      })),
    };
  } catch (error) {
    return {
      available: false,
      source: "google-drive",
      query,
      files: [],
      error:
        error instanceof Error
          ? error.message
          : "Impossible de consulter Google Drive.",
    };
  }
}
