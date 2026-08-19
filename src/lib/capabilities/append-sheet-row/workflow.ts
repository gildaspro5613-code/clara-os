/**
 * ============================================
 * CLARA OS
 * Append Sheet Row Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace spreadsheet
 * → append rows to Google Sheets.
 * ============================================
 */

import { appendRow } from "@/lib/connectors/google/sheets";
import {
  getWorkspaceSpreadsheet,
} from "@/lib/core/workspace/workspace-resolver";

import type { AppendSheetRowContext } from "./context";
import type { AppendSheetRowResult } from "./result";

export class AppendSheetRowWorkflow {

  public async execute(
    context: AppendSheetRowContext,
  ): Promise<AppendSheetRowResult> {

    if (!context.range.trim()) {

      return {
        success: false,
        spreadsheetId: "",
        sheetName: context.range,
        affectedRows: 0,
        message: "Target range is required.",
        completedAt: new Date(),
      };

    }

    if (context.rows.length === 0) {

      return {
        success: false,
        spreadsheetId: "",
        sheetName: context.range,
        affectedRows: 0,
        message: "At least one row is required.",
        completedAt: new Date(),
      };

    }

    const spreadsheet =
      getWorkspaceSpreadsheet(
        context.role,
      );

    if (!spreadsheet) {

      return {
        success: false,
        spreadsheetId: "",
        sheetName: context.range,
        affectedRows: 0,
        message:
          `Workspace spreadsheet not found for role "${context.role}".`,
        completedAt: new Date(),
      };

    }

    try {

      const result =
        await appendRow({
          spreadsheetId:
            spreadsheet.spreadsheetId,

          range:
            context.range,

          rows:
            context.rows as (
              string | number | boolean | null
            )[][],

        });

      return {

        success: true,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.range,

        affectedRows:
          result.updatedRows,

        message:
          `Successfully appended ${result.updatedRows} row(s) to "${spreadsheet.title}".`,

        completedAt:
          new Date(),

      };

    } catch (error) {

      return {

        success: false,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.range,

        affectedRows:
          0,

        message:
          error instanceof Error
            ? error.message
            : "Unable to append rows to Google Sheets.",

        completedAt:
          new Date(),

      };

    }

  }

}
