/**
 * ============================================
 * CLARA OS
 * Find Sheet Row Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

import type { WorkspaceSpreadsheetRole } from "@/onboarding/models/workspace-spreadsheet";

export interface FindSheetRowContext {

  /**
   * Business workspace resource.
   */
  readonly role: WorkspaceSpreadsheetRole;

  /**
   * Target worksheet/range.
   */
  readonly range: string;

  /**
   * Header name used for the search.
   */
  readonly column: string;

  /**
   * Value to find.
   */
  readonly value: string;

}
