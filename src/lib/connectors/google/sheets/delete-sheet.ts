/**
 * ============================================
 * CLARA OS
 * Google Sheets – Delete Sheet
 * --------------------------------------------
 * File : delete-sheet.ts
 * Responsibility :
 * Deletes a worksheet tab from
 * a Google spreadsheet.
 * ============================================
 */

import { SheetsClient } from "./sheets-client";

/**
 * Options for deleting a worksheet tab.
 */
export interface DeleteSheetOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * Identifier of the worksheet tab to delete.
   */
  sheetId: number;

}

/**
 * Deletes one worksheet tab from a spreadsheet.
 *
 * Uses {@link SheetsClient} to obtain an authenticated Sheets client and
 * delegates to the Sheets API v4 `spreadsheets.batchUpdate` endpoint using a
 * `DeleteSheetRequest`. Errors thrown by the API are propagated unchanged.
 *
 * @param options - Spreadsheet identifier and worksheet tab identifier.
 * @returns Resolves when the worksheet has been deleted.
 * @throws {Error} When `spreadsheetId` is empty or `sheetId` is invalid.
 */
export async function deleteSheet(
  options: DeleteSheetOptions,
): Promise<void> {

  if (!options.spreadsheetId.trim()) {

    throw new Error("deleteSheet: spreadsheetId must not be empty.");

  }

  if (!Number.isInteger(options.sheetId) || options.sheetId < 0) {

    throw new Error("deleteSheet: sheetId must be a non-negative integer.");

  }

  const sheets = await new SheetsClient().create();

  await sheets.spreadsheets.batchUpdate({

    spreadsheetId: options.spreadsheetId,

    requestBody: {

      requests: [
        {
          deleteSheet: {
            sheetId: options.sheetId,
          },
        },
      ],

    },

  });

}
