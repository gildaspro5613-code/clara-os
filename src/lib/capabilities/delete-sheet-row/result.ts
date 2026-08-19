/**
 * ============================================
 * CLARA OS
 * Delete Sheet Row Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface DeleteSheetRowResult {

  readonly success: boolean;

  readonly spreadsheetId: string;

  readonly sheetName: string;

  /**
   * Real Google Sheets row index deleted.
   */
  readonly deletedRow: number;

  readonly message: string;

  readonly completedAt: Date;

}
