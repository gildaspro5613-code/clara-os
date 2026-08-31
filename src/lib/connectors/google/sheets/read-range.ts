/**
 * ============================================
 * CLARA OS
 * Google Sheets – Read Range
 * --------------------------------------------
 * File : read-range.ts
 * Responsibility :
 * Reads values from one A1 range
 * in a Google spreadsheet.
 * ============================================
 */

import type { sheets_v4 } from "googleapis";

import { SheetsClient } from "./sheets-client";

/**
 * Options for reading values from a spreadsheet range.
 */
export interface ReadRangeOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * A1 notation of the range to read.
   */
  range: string;

  /**
   * Major dimension used in the response.
   */
  majorDimension?: "ROWS" | "COLUMNS";

  /**
   * Controls how values are represented in the response.
   */
  valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE" | "FORMULA";

  /**
   * Controls date-time rendering in the response.
   */
  dateTimeRenderOption?: "SERIAL_NUMBER" | "FORMATTED_STRING";

}

/**
 * Values returned by a Sheets range read.
 */
export interface ReadRangeResult {

  /**
   * The range the values cover.
   */
  range?: string;

  /**
   * The major dimension of returned values.
   */
  majorDimension?: string;

  /**
   * Matrix of cell values.
   */
  values: unknown[][];

}

/**
 * Reads cell values from an A1 range.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.values.get` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier and read controls.
 * @returns The requested cell values.
 * @throws {Error} When `spreadsheetId` or `range` is empty.
 */
export async function readRange(
  options: ReadRangeOptions,
): Promise<ReadRangeResult> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("readRange: spreadsheetId must not be empty.");

  }

  if (!options.range.trim()) {

    throw new Error("readRange: range must not be empty.");

  }

  const sheets = await new SheetsClient().create();

  const params: sheets_v4.Params$Resource$Spreadsheets$Values$Get = {

    spreadsheetId: options.spreadsheetId,

    range: options.range,

  };

  if (options.majorDimension !== undefined) {

    params.majorDimension = options.majorDimension;

  }

  if (options.valueRenderOption !== undefined) {

    params.valueRenderOption = options.valueRenderOption;

  }

  if (options.dateTimeRenderOption !== undefined) {

    params.dateTimeRenderOption = options.dateTimeRenderOption;

  }

  const response = await sheets.spreadsheets.values.get(params);

  return {

    range: response.data.range ?? undefined,

    majorDimension: response.data.majorDimension ?? undefined,

    values: response.data.values ?? [],

  };

}
