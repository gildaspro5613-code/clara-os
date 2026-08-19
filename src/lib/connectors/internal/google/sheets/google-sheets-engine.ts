/**
 * ============================================
 * CLARA OS
 * Google Sheets Connector
 * --------------------------------------------
 * File : google-sheets-engine.ts
 * Responsibility :
 * Coordinates Google Sheets
 * operations.
 * ============================================
 */

import {
  appendRow,
  clearRange,
  readRange,
  updateRange,
  writeRange,
} from "@/lib/connectors/google/sheets";

import { GoogleSheetsContext } from "./google-sheets-context";
import { GoogleSheetsResult } from "./google-sheets-result";

/**
 * Google Sheets engine.
 *
 * This engine adapts the existing Google Sheets
 * API operations to the internal Clara OS connector
 * architecture.
 */
export class GoogleSheetsEngine {

  /**
   * Reads data from a worksheet.
   */
  public async read(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult> {

    const result = await readRange({
      spreadsheetId: context.spreadsheetId,
      range:
        context.range ??
        context.sheetName,
    });

    return {
      success: true,
      spreadsheetId: context.spreadsheetId,
      sheetName: context.sheetName,
      values: result.values,
      affectedRows: result.values.length,
      message: "Read operation completed.",
      completedAt: new Date(),
    };
  }

  /**
   * Writes data to a worksheet.
   */
  public async write(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult> {

    const result = await writeRange({
      spreadsheetId: context.spreadsheetId,
      range:
        context.range ??
        context.sheetName,
      values:
        (context.values ?? []) as (
          string | number | boolean | null
        )[][],
    });

    return {
      success: true,
      spreadsheetId: context.spreadsheetId,
      sheetName: context.sheetName,
      values: context.values,
      affectedRows: result.updatedRows,
      message: "Write operation completed.",
      completedAt: new Date(),
    };
  }

  /**
   * Updates worksheet data.
   */
  public async update(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult> {

    const result = await updateRange({
      spreadsheetId: context.spreadsheetId,
      updates: [
        {
          range:
            context.range ??
            context.sheetName,
          values:
            (context.values ?? []) as (
              string | number | boolean | null
            )[][],
        },
      ],
    });

    return {
      success: true,
      spreadsheetId: context.spreadsheetId,
      sheetName: context.sheetName,
      values: context.values,
      affectedRows: result.totalUpdatedRows,
      message: "Update operation completed.",
      completedAt: new Date(),
    };
  }

  /**
   * Deletes values from a worksheet range.
   *
   * This clears cell values. It does not delete
   * the worksheet tab itself.
   */
  public async delete(
    context: GoogleSheetsContext,
  ): Promise<GoogleSheetsResult> {

    const result = await clearRange({
      spreadsheetId: context.spreadsheetId,
      range:
        context.range ??
        context.sheetName,
    });

    return {
      success: true,
      spreadsheetId:
        result.spreadsheetId ??
        context.spreadsheetId,
      sheetName: context.sheetName,
      affectedRows: 0,
      message: "Delete operation completed.",
      completedAt: new Date(),
    };
  }

}
