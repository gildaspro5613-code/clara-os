/**
 * ============================================
 * CLARA OS
 * Read Sheet Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface ReadSheetResult {

  readonly success: boolean;

  readonly spreadsheetId: string;

  readonly sheetName: string;

  readonly values: unknown[][];

  readonly affectedRows: number;

  readonly message: string;

  readonly completedAt: Date;

}
