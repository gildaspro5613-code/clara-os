/**
 * ============================================
 * CLARA OS
 * Brain Module
 *
 * File : task-execution.ts
 * Responsibility :
 * Resolve a safe execution contract for a
 * Brain-generated action.
 * ============================================
 */

import type { Decision } from "@/types";
import type { TaskExecution } from "@/types/task";
import type { BrainSourceContext } from "./brain-source";
import type { BrainDriveContext } from "./drive-context";

function getDriveContext(
  sources: BrainSourceContext[],
): BrainDriveContext | undefined {
  const source = sources.find(
    (item) => item.source === "google-drive",
  );

  if (!source?.available) {
    return undefined;
  }

  return source.data as BrainDriveContext;
}

function resolveDriveFile(
  action: string,
  drive: BrainDriveContext,
) {
  const normalized = action.trim().toLowerCase();

  const matches = drive.files.filter((file) => {
    const fileName = file.name.trim().toLowerCase();

    return (
      normalized.includes(fileName) ||
      fileName.includes(normalized)
    );
  });

  return matches.length === 1
    ? matches[0]
    : undefined;
}

function resolveFolderName(
  action: string,
): string | undefined {
  const match = action.match(
    /\b(?:dans le dossier|dans la dossier|dans|vers)\s+(.+)$/i,
  );

  return match?.[1]
    ?.trim()
    .replace(/[.,!?;:]+$/g, "")
    .trim() || undefined;
}

/**
 * Resolve an executable capability from a Brain action.
 *
 * V1 remains conservative:
 * only explicit and sufficiently identified
 * actions are automatically executable.
 */
export function resolveTaskExecution(
  action: string,
  decision: Decision,
  sources: BrainSourceContext[] = [],
): TaskExecution | undefined {
  const normalized = action.trim().toLowerCase();

  const hasGenerationVerb =
    /\b(rédiger|rediger|écrire|ecrire|créer|creer|générer|generer|produire|composer)\b/.test(
      normalized,
    );

  const hasDocumentTarget =
    /\b(document|rapport|présentation|presentation|contrat|devis|compte-rendu|dossier)\b/.test(
      normalized,
    );

  if (hasGenerationVerb && hasDocumentTarget) {
    return {
      capabilityId: "generate-document",
      context: {
        title: action.trim(),
        objective: decision.objective.description,
        audience: "Destinataire du document",
        language: "français",
        tone: "professionnel",
      },
    };
  }

  const isDriveOrganization =
    /\b(organiser|organise|ranger|range|déplacer|déplace|classer|classe)\b/.test(
      normalized,
    ) &&
    /\b(drive|fichier|document|dossier)\b/.test(
      normalized,
    );

  if (!isDriveOrganization) {
    return undefined;
  }

  const drive = getDriveContext(sources);

  if (!drive) {
    return undefined;
  }

  const file = resolveDriveFile(
    action,
    drive,
  );

  const folderName =
    resolveFolderName(action);

  if (!file || !folderName) {
    return undefined;
  }

  return {
    capabilityId: "organize-drive",
    context: {
      fileId: file.id,
      folderName,
    },
  };
}
