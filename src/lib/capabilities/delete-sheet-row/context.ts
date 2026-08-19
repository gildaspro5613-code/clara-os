/**
 * ============================================
 * CLARA OS
 * Delete Sheet Row Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

import type { WorkspaceSpreadsheetRole } from "@/onboarding/models/workspace-spreadsheet";

export interface DeleteSheetRowContext {

  /**
   * Business workspace resource.
   */
  readonly role: WorkspaceSpreadsheetRole;

  /**
   * Worksheet tab name.
   */
  readonly sheetName: string;

  /**
   * Real Google Sheets row index.
   * One-based, as exposed by find-sheet-row.
   */
  readonly rowIndex: number;

}
