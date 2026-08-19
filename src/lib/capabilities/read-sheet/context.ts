/**
 * ============================================
 * CLARA OS
 * Read Sheet Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

import type { WorkspaceSpreadsheetRole } from "@/onboarding/models/workspace-spreadsheet";

export interface ReadSheetContext {

  /**
   * Business workspace resource.
   */
  readonly role: WorkspaceSpreadsheetRole;

  /**
   * Target worksheet/range in A1 notation.
   */
  readonly range: string;

}
