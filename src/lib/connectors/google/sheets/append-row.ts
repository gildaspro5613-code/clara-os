/**
 * ============================================
 * CLARA OS
 * Google Sheets – Append Row
 * --------------------------------------------
 * File : append-row.ts
 * Responsibility :
 * Appends one or more rows at the end
 * of a Google Sheets range.
 * ============================================
 */

import { SheetsClient } from "./sheets-client";
import type { SheetValues } from "./write-range";

/**
 * Options for appending rows to a spreadsheet.
 */
export interface AppendRowOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * A1 notation of the target table/range.
   */
  range: string;

  /**
   * Rows to append.
   */
  rows: SheetValues;

  /**
   * Input interpretation mode.
   */
  valueInputOption?: "RAW" | "USER_ENTERED";

  /**
   * Insert behavior for appended data.
   */
  insertDataOption?: "OVERWRITE" | "INSERT_ROWS";

  /**
   * Whether to include updated values in the response.
   */
  includeValuesInResponse?: boolean;

}

/**
 * Summary of appended rows.
 */
export interface AppendRowResult {

  /**
   * A1 range before append.
   */
  tableRange?: string;

  /**
   * Updated range after append.
   */
  updatedRange?: string;

  /**
   * Number of appended rows.
   */
  updatedRows: number;

  /**
   * Number of appended columns.
   */
  updatedColumns: number;

  /**
   * Number of appended cells.
   */
  updatedCells: number;

}

/**
 * Appends rows to a Google Sheets range.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.values.append` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier, target range, and rows.
 * @returns Summary of appended values.
 * @throws {Error} When `spreadsheetId` or `range` is empty.
 * @throws {Error} When `rows` is empty.
 */
export async function appendRow(
  options: AppendRowOptions,
): Promise<AppendRowResult> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("appendRow: spreadsheetId must not be empty.");

  }

  if (!options.range.trim()) {

    throw new Error("appendRow: range must not be empty.");

  }

  if (options.rows.length === 0) {

    throw new Error("appendRow: rows must contain at least one row.");

  }

  const sheets = await new SheetsClient().create();

  const response = await sheets.spreadsheets.values.append({

    spreadsheetId: options.spreadsheetId,

    range: options.range,

    valueInputOption: options.valueInputOption ?? "USER_ENTERED",

    insertDataOption: options.insertDataOption ?? "INSERT_ROWS",

    includeValuesInResponse: options.includeValuesInResponse,

    requestBody: {

      majorDimension: "ROWS",

      values: options.rows,

    },

  });

  const updates = response.data.updates;

  return {

    tableRange: response.data.tableRange ?? undefined,

    updatedRange: updates?.updatedRange ?? undefined,

    updatedRows: updates?.updatedRows ?? 0,

    updatedColumns: updates?.updatedColumns ?? 0,

    updatedCells: updates?.updatedCells ?? 0,

  };

}
