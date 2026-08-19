/**
 * ============================================
 * CLARA OS
 * Google Sheets – Delete Row
 * --------------------------------------------
 * Deletes one or more spreadsheet rows.
 * ============================================
 */

import { SheetsClient } from "./sheets-client";

export interface DeleteRowOptions {

  /**
   * Spreadsheet identifier.
   */
  spreadsheetId: string;

  /**
   * Worksheet tab identifier.
   */
  sheetId: number;

  /**
   * Zero-based inclusive start row index.
   */
  startIndex: number;

  /**
   * Zero-based exclusive end row index.
   */
  endIndex: number;

}

/**
 * Deletes spreadsheet rows using a DeleteDimensionRequest.
 */
export async function deleteRow(
  options: DeleteRowOptions,
): Promise<void> {

  if (!options.spreadsheetId.trim()) {

    throw new Error(
      "deleteRow: spreadsheetId must not be empty.",
    );

  }

  if (
    !Number.isInteger(options.sheetId) ||
    options.sheetId < 0
  ) {

    throw new Error(
      "deleteRow: sheetId must be a non-negative integer.",
    );

  }

  if (
    !Number.isInteger(options.startIndex) ||
    options.startIndex < 0
  ) {

    throw new Error(
      "deleteRow: startIndex must be a non-negative integer.",
    );

  }

  if (
    !Number.isInteger(options.endIndex) ||
    options.endIndex <= options.startIndex
  ) {

    throw new Error(
      "deleteRow: endIndex must be greater than startIndex.",
    );

  }

  const sheets =
    new SheetsClient().create();

  await sheets.spreadsheets.batchUpdate({

    spreadsheetId:
      options.spreadsheetId,

    requestBody: {

      requests: [

        {
          deleteDimension: {

            range: {

              sheetId:
                options.sheetId,

              dimension:
                "ROWS",

              startIndex:
                options.startIndex,

              endIndex:
                options.endIndex,

            },

          },

        },

      ],

    },

  });

}
