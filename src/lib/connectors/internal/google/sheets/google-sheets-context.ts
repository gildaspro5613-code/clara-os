/**
 * ============================================
 * CLARA OS
 * Google Sheets Connector
 * --------------------------------------------
 * File : google-sheets-context.ts
 * Responsibility :
 * Defines the execution context
 * for Google Sheets operations.
 * ============================================
 */

/**
 * Google Sheets context.
 */
export interface GoogleSheetsContext {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * Worksheet name.
   */
  sheetName: string;

  /**
   * Target range.
   */
  range?: string;

  /**
   * Row values.
   */
  values?: unknown[][];

  /**
   * Optional filters.
   */
  filters?: Record<string, unknown>;

}