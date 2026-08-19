/**
 * ============================================
 * CLARA OS
 * Find Sheet Row Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface FindSheetRowResult {

  readonly success: boolean;

  readonly spreadsheetId: string;

  readonly sheetName: string;

  readonly rows: unknown[][];

  /**
   * Real Google Sheets row indexes.
   * Index 1 corresponds to the first spreadsheet row.
   */
  readonly rowIndexes: number[];

  readonly matchedRows: number;

  readonly message: string;

  readonly completedAt: Date;

}
