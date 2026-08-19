/**
 * ============================================
 * CLARA OS
 * Update Sheet Row Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface UpdateSheetRowResult {

  readonly success: boolean;

  readonly spreadsheetId: string;

  readonly sheetName: string;

  readonly affectedRows: number;

  readonly message: string;

  readonly completedAt: Date;

}
