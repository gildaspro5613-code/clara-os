/**
 * ============================================
 * CLARA OS
 * Google Sheets Connector
 * --------------------------------------------
 * File : google-sheets-result.ts
 * Responsibility :
 * Defines the result returned
 * by the Google Sheets connector.
 * ============================================
 */

/**
 * Google Sheets result.
 */
export interface GoogleSheetsResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * Worksheet name.
   */
  sheetName: string;

  /**
   * Returned values.
   */
  values?: unknown[][];

  /**
   * Number of affected rows.
   */
  affectedRows?: number;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}