/**
 * ============================================
 * CLARA OS
 * Core Workspace Resolver
 * --------------------------------------------
 * Resolves persistent workspace resources
 * without exposing Google IDs to the Brain.
 * ============================================
 */

import type {
  WorkspaceSpreadsheet,
  WorkspaceSpreadsheetRole,
} from "@/onboarding/models/workspace-spreadsheet";

import { loadWorkspace } from "./workspace-store";

/**
 * Resolves one Google Spreadsheet from
 * Clara's persistent workspace.
 */
export function getWorkspaceSpreadsheet(
  role: WorkspaceSpreadsheetRole,
): WorkspaceSpreadsheet | null {

  const workspace =
    loadWorkspace();

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
