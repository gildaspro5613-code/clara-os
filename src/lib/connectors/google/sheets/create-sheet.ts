/**
 * ============================================
 * CLARA OS
 * Google Sheets – Create Sheet
 * --------------------------------------------
 * File : create-sheet.ts
 * Responsibility :
 * Creates a new Google spreadsheet
 * using SheetsClient.
 * ============================================
 */

import type { sheets_v4 } from "googleapis";

import { SheetsClient } from "./sheets-client";

/**
 * One worksheet definition created with the spreadsheet.
 */
export interface CreateSpreadsheetSheet {

  /**
   * Worksheet title.
   */
  title: string;

  /**
   * Initial row count.
   */
  rowCount?: number;

  /**
   * Initial column count.
   */
  columnCount?: number;

}

/**
 * Options for creating a spreadsheet.
 */
export interface CreateSheetOptions {

  /**
   * Spreadsheet title.
   */
  title: string;

  /**
   * Spreadsheet locale.
   */
  locale?: string;

  /**
   * Spreadsheet time zone.
   */
  timeZone?: string;

  /**
   * Optional initial worksheet definitions.
   */
  sheets?: CreateSpreadsheetSheet[];

}

/**
 * Created spreadsheet summary.
 */
export interface CreateSpreadsheetResult {

  /**
   * Unique spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * Spreadsheet title.
   */
  title?: string;

  /**
   * URL used to open the spreadsheet.
   */
  spreadsheetUrl?: string;

  /**
   * Created worksheet metadata.
   */
  sheets: Array<{
    sheetId: number;
    title: string;
  }>;

}

/**
 * Creates a Google spreadsheet.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.create` endpoint.
 * Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet metadata and optional worksheet definitions.
 * @returns Created spreadsheet metadata.
 * @throws {Error} When `title` is empty or blank.
 * @throws {Error} When one initial worksheet title is empty.
 */
export async function createSheet(
  options: CreateSheetOptions,
): Promise<CreateSpreadsheetResult> {

  if (!options.title.trim()) {

    throw new Error("createSheet: title must not be empty.");

  }

  for (const [index, sheet] of (options.sheets ?? []).entries()) {

    if (!sheet.title.trim()) {

      throw new Error(`createSheet: sheets[${index}].title must not be empty.`);

    }

  }

  const sheets = new SheetsClient().create();

  const requestBody: sheets_v4.Schema$Spreadsheet = {

    properties: {

      title: options.title,

      locale: options.locale,

      timeZone: options.timeZone,

    },

    sheets: options.sheets?.map((sheet) => ({

      properties: {

        title: sheet.title,

        gridProperties: {

          rowCount: sheet.rowCount,

          columnCount: sheet.columnCount,

        },

      },

    })),

  };

  const response = await sheets.spreadsheets.create({

    requestBody,

    fields: "spreadsheetId,spreadsheetUrl,properties(title),sheets(properties(sheetId,title))",

  });

  if (typeof response.data.spreadsheetId !== "string") {

    throw new Error("createSheet: Google API did not return a spreadsheetId.");

  }

  const createdSheets =
    (response.data.sheets ?? [])
      .map((entry) => entry.properties)
      .filter(
        (properties): properties is sheets_v4.Schema$SheetProperties & {
          sheetId: number;
          title: string;
        } =>
          typeof properties?.sheetId === "number" &&
          typeof properties.title === "string",
      )
      .map((properties) => ({
        sheetId: properties.sheetId,
        title: properties.title,
      }));

  return {

    spreadsheetId: response.data.spreadsheetId,

    title: response.data.properties?.title ?? undefined,

    spreadsheetUrl: response.data.spreadsheetUrl ?? undefined,

    sheets: createdSheets,

  };

}
