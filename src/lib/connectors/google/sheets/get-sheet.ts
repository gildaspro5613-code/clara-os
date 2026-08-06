/**
 * ============================================
 * CLARA OS
 * Google Sheets – Get Sheet
 * --------------------------------------------
 * File : get-sheet.ts
 * Responsibility :
 * Retrieves spreadsheet metadata
 * using SheetsClient.
 * ============================================
 */

import type { sheets_v4 } from "googleapis";

import { SheetsClient } from "./sheets-client";

/**
 * Options for retrieving Google Sheets metadata.
 */
export interface GetSheetOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * Spreadsheet ranges to include in the response.
   */
  ranges?: string[];

  /**
   * Whether to include grid data in the response.
   */
  includeGridData?: boolean;

  /**
   * Partial response field selector.
   */
  fields?: string;

}

/**
 * Retrieves Google Sheets spreadsheet metadata.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates the call to the Sheets API v4 `spreadsheets.get` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier and optional retrieval controls.
 * @returns Spreadsheet metadata.
 * @throws {Error} When `spreadsheetId` is empty or blank.
 */
export async function getSheet(
  options: GetSheetOptions,
): Promise<sheets_v4.Schema$Spreadsheet> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("getSheet: spreadsheetId must not be empty.");

  }

  const sheets = new SheetsClient().create();

  const params: sheets_v4.Params$Resource$Spreadsheets$Get = {

    spreadsheetId: options.spreadsheetId,

  };

  if (options.ranges !== undefined) {

    params.ranges = options.ranges;

  }

  if (options.includeGridData !== undefined) {

    params.includeGridData = options.includeGridData;

  }

  if (options.fields !== undefined) {

    params.fields = options.fields;

  }

  const response = await sheets.spreadsheets.get(params);

  return response.data;

}
