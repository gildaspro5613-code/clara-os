/**
 * ============================================
 * CLARA OS
 * Core Workspace Resolver
 * --------------------------------------------
 * Resolves persistent workspace resources
 * without exposing Google IDs to the Brain.
 * ============================================
 */

import type { WorkspaceFolder } from "@/onboarding/models/workspace-folder";
import type { WorkspaceDocument } from "@/onboarding/models/workspace-document";
import type { WorkspaceCalendar } from "@/onboarding/models/workspace-calendar";

import type {
  WorkspaceSpreadsheet,
  WorkspaceSpreadsheetRole,
} from "@/onboarding/models/workspace-spreadsheet";

import { loadWorkspace } from "./workspace-store";

/**
 * Resolves one Google Drive folder from
 * Clara's persistent workspace.
 */
export async function getWorkspaceFolder(
  name: string,
): Promise<WorkspaceFolder | null> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {
    return null;
  }

  return (
    workspace.folders.find(
      (folder) =>
        folder.name === name,
    ) ?? null
  );
}


/**
 * Resolves one Google Document from
 * Clara's persistent workspace.
 */
export async function getWorkspaceDocument(
  name: string,
): Promise<WorkspaceDocument | null> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {
    return null;
  }

  return (
    workspace.documents.find(
      (document) =>
        document.name === name,
    ) ?? null
  );
}


/**
 * Resolves the Google Calendar from
 * Clara's persistent workspace.
 */
export async function getWorkspaceCalendar(): Promise<WorkspaceCalendar | null> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {
    return null;
  }

  return workspace.calendar ?? null;
}


/**
 * Resolves one Google Spreadsheet from
 * Clara's persistent workspace.
 */
export async function getWorkspaceSpreadsheet(
  role: WorkspaceSpreadsheetRole,
): Promise<WorkspaceSpreadsheet | null> {

  const workspace =
    await loadWorkspace();

  if (!workspace) {
    return null;
  }

  return (
    workspace.spreadsheets.find(
      (spreadsheet) =>
        spreadsheet.role === role,
    ) ?? null
  );
}
