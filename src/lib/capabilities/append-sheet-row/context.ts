/**
 * ============================================
 * CLARA OS
 * Append Sheet Row Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

import type { WorkspaceSpreadsheetRole } from "@/onboarding/models/workspace-spreadsheet";

export interface AppendSheetRowContext {

  /**
   * Business workspace resource.
   */
  readonly role: WorkspaceSpreadsheetRole;

  /**
   * Target worksheet/range.
   */
  readonly range: string;

  /**
   * Rows to append.
   */
  readonly rows: unknown[][];
}
