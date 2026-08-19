/**
 * ============================================
 * CLARA OS
 * Update Sheet Row Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

import type { WorkspaceSpreadsheetRole } from "@/onboarding/models/workspace-spreadsheet";

export interface UpdateSheetRowContext {

  /**
   * Business workspace resource.
   */
  readonly role: WorkspaceSpreadsheetRole;

  /**
   * Target worksheet/range in A1 notation.
   */
  readonly range: string;

  /**
   * Values to update.
   */
  readonly values: unknown[][];
}
