/**
 * ============================================
 * CLARA OS
 * Google Sheets – Clear Range
 * --------------------------------------------
 * File : clear-range.ts
 * Responsibility :
 * Clears values from one A1 range
 * in a Google spreadsheet.
 * ============================================
 */

import { SheetsClient } from "./sheets-client";

/**
 * Options for clearing one spreadsheet range.
 */
export interface ClearRangeOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * A1 notation of the range to clear.
   */
  range: string;

}

/**
 * Result returned after clearing a range.
 */
export interface ClearRangeResult {

  /**
   * Spreadsheet identifier where values were cleared.
   */
  spreadsheetId?: string;

  /**
   * A1 notation of the cleared range.
   */
  clearedRange?: string;

}

/**
 * Clears values from one spreadsheet range.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.values.clear` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier and range to clear.
 * @returns Cleared range metadata.
 * @throws {Error} When `spreadsheetId` or `range` is empty.
 */
export async function clearRange(
  options: ClearRangeOptions,
): Promise<ClearRangeResult> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("clearRange: spreadsheetId must not be empty.");

  }

  if (!options.range.trim()) {

    throw new Error("clearRange: range must not be empty.");

  }

  const sheets = await new SheetsClient().create();

  const response = await sheets.spreadsheets.values.clear({

    spreadsheetId: options.spreadsheetId,

    range: options.range,

  });

  return {

    spreadsheetId: response.data.spreadsheetId ?? undefined,

    clearedRange: response.data.clearedRange ?? undefined,

  };

}
