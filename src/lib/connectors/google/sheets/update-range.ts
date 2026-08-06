/**
 * ============================================
 * CLARA OS
 * Google Sheets – Update Range
 * --------------------------------------------
 * File : update-range.ts
 * Responsibility :
 * Updates existing values in one or more
 * spreadsheet ranges in a single call.
 * ============================================
 */

import { SheetsClient } from "./sheets-client";
import type { SheetValues } from "./write-range";

/**
 * One range update instruction.
 */
export interface UpdateRangeEntry {

  /**
   * A1 notation of the range to update.
   */
  range: string;

  /**
   * Values to write in the specified range.
   */
  values: SheetValues;

  /**
   * Major dimension for the provided values.
   */
  majorDimension?: "ROWS" | "COLUMNS";

}

/**
 * Options for updating spreadsheet ranges.
 */
export interface UpdateRangeOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * One or more range update entries.
   */
  updates: UpdateRangeEntry[];

  /**
   * Input interpretation mode.
   */
  valueInputOption?: "RAW" | "USER_ENTERED";

  /**
   * Whether to include updated values in the response.
   */
  includeValuesInResponse?: boolean;

}

/**
 * Batch update summary.
 */
export interface UpdateRangeResult {

  /**
   * Number of updated ranges.
   */
  totalUpdatedRanges: number;

  /**
   * Number of updated rows.
   */
  totalUpdatedRows: number;

  /**
   * Number of updated columns.
   */
  totalUpdatedColumns: number;

  /**
   * Number of updated cells.
   */
  totalUpdatedCells: number;

}

/**
 * Updates existing values in one or more spreadsheet ranges.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.values.batchUpdate` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier and update instructions.
 * @returns Aggregated update statistics.
 * @throws {Error} When `spreadsheetId` is empty.
 * @throws {Error} When `updates` is empty or includes a blank range.
 */
export async function updateRange(
  options: UpdateRangeOptions,
): Promise<UpdateRangeResult> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("updateRange: spreadsheetId must not be empty.");

  }

  if (options.updates.length === 0) {

    throw new Error("updateRange: updates must contain at least one entry.");

  }

  for (const [index, update] of options.updates.entries()) {

    if (!update.range.trim()) {

      throw new Error(`updateRange: updates[${index}].range must not be empty.`);

    }

  }

  const sheets = new SheetsClient().create();

  const response = await sheets.spreadsheets.values.batchUpdate({

    spreadsheetId: options.spreadsheetId,

    requestBody: {

      valueInputOption: options.valueInputOption ?? "USER_ENTERED",

      includeValuesInResponse: options.includeValuesInResponse,

      data: options.updates.map((update) => ({

        range: update.range,

        majorDimension: update.majorDimension,

        values: update.values,

      })),

    },

  });

  return {

    totalUpdatedRanges: response.data.totalUpdatedRanges ?? 0,

    totalUpdatedRows: response.data.totalUpdatedRows ?? 0,

    totalUpdatedColumns: response.data.totalUpdatedColumns ?? 0,

    totalUpdatedCells: response.data.totalUpdatedCells ?? 0,

  };

}
