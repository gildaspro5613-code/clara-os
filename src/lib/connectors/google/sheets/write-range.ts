/**
 * ============================================
 * CLARA OS
 * Google Sheets – Write Range
 * --------------------------------------------
 * File : write-range.ts
 * Responsibility :
 * Overwrites values in one A1 range
 * of a Google spreadsheet.
 * ============================================
 */

import { SheetsClient } from "./sheets-client";

/**
 * Supported scalar value for one Sheets cell.
 */
export type SheetCellValue = string | number | boolean | null;

/**
 * One row of values in a spreadsheet.
 */
export type SheetRow = SheetCellValue[];

/**
 * Matrix of spreadsheet values.
 */
export type SheetValues = SheetRow[];

/**
 * Options for writing values to one spreadsheet range.
 */
export interface WriteRangeOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * A1 notation of the target range.
   */
  range: string;

  /**
   * Values to write.
   */
  values: SheetValues;

  /**
   * Input interpretation mode.
   */
  valueInputOption?: "RAW" | "USER_ENTERED";

  /**
   * Major dimension of the input values.
   */
  majorDimension?: "ROWS" | "COLUMNS";

  /**
   * Whether to include updated values in the response.
   */
  includeValuesInResponse?: boolean;

}

/**
 * Write summary returned by the Sheets API.
 */
export interface WriteRangeResult {

  /**
   * A1 notation of the updated range.
   */
  updatedRange?: string;

  /**
   * Number of updated rows.
   */
  updatedRows: number;

  /**
   * Number of updated columns.
   */
  updatedColumns: number;

  /**
   * Number of updated cells.
   */
  updatedCells: number;

}

/**
 * Overwrites values in one spreadsheet range.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.values.update` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier, range, and values to write.
 * @returns Updated range summary.
 * @throws {Error} When `spreadsheetId` or `range` is empty.
 */
export async function writeRange(
  options: WriteRangeOptions,
): Promise<WriteRangeResult> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("writeRange: spreadsheetId must not be empty.");

  }

  if (!options.range.trim()) {

    throw new Error("writeRange: range must not be empty.");

  }

  const sheets = new SheetsClient().create();

  const response = await sheets.spreadsheets.values.update({

    spreadsheetId: options.spreadsheetId,

    range: options.range,

    valueInputOption: options.valueInputOption ?? "USER_ENTERED",

    includeValuesInResponse: options.includeValuesInResponse,

    requestBody: {

      range: options.range,

      majorDimension: options.majorDimension,

      values: options.values,

    },

  });

  return {

    updatedRange: response.data.updatedRange ?? undefined,

    updatedRows: response.data.updatedRows ?? 0,

    updatedColumns: response.data.updatedColumns ?? 0,

    updatedCells: response.data.updatedCells ?? 0,

  };

}
