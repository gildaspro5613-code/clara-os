/**
 * ============================================
 * CLARA OS
 * Update Sheet Row Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace spreadsheet
 * → update values in Google Sheets.
 * ============================================
 */

import { updateRange } from "@/lib/connectors/google/sheets";

import {
  getWorkspaceSpreadsheet,
} from "@/lib/core/workspace/workspace-resolver";

import type { UpdateSheetRowContext } from "./context";
import type { UpdateSheetRowResult } from "./result";

export class UpdateSheetRowWorkflow {

  public async execute(
    context: UpdateSheetRowContext,
  ): Promise<UpdateSheetRowResult> {

    if (!context.range.trim()) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: "",

        affectedRows: 0,

        message:
          "Target range is required.",

        completedAt:
          new Date(),

      };

    }

    if (context.values.length === 0) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: context.range,

        affectedRows: 0,

        message:
          "At least one row of values is required.",

        completedAt:
          new Date(),

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

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await updateRange({

          spreadsheetId:
            spreadsheet.spreadsheetId,

          updates: [

            {

              range:
                context.range,

              values:
                context.values as (
                  string | number | boolean | null
                )[][],

            },

          ],

        });

      return {

        success: true,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.range,

        affectedRows:
          result.totalUpdatedRows,

        message:
          `Successfully updated ${result.totalUpdatedRows} row(s) in "${spreadsheet.title}".`,

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
            : "Unable to update Google Sheets.",

        completedAt:
          new Date(),

      };

    }

  }

}
