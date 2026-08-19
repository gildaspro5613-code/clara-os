/**
 * ============================================
 * CLARA OS
 * Append Sheet Row Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface AppendSheetRowResult {
  readonly success: boolean;
  readonly spreadsheetId: string;
  readonly sheetName: string;
  readonly updatedRange?: string;
  readonly affectedRows: number;
  readonly message: string;
  readonly completedAt: Date;
}
