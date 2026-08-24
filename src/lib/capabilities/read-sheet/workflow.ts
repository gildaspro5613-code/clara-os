/**
 * ============================================
 * CLARA OS
 * Read Sheet Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace spreadsheet
 * → read values from Google Sheets.
 * ============================================
 */

import { readRange } from "@/lib/connectors/google/sheets";

import {
  getWorkspaceSpreadsheet,
} from "@/lib/core/workspace/workspace-resolver";

import type { ReadSheetContext } from "./context";
import type { ReadSheetResult } from "./result";

export class ReadSheetWorkflow {

  public async execute(
    context: ReadSheetContext,
  ): Promise<ReadSheetResult> {

    if (!context.range.trim()) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: "",

        values: [],

        affectedRows: 0,

        message:
          "Target range is required.",

        completedAt:
          new Date(),

      };

    }

    const spreadsheet =
      await getWorkspaceSpreadsheet(
        context.role,
      );

    if (!spreadsheet) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: context.range,

        values: [],

        affectedRows: 0,

        message:
          `Workspace spreadsheet not found for role "${context.role}".`,

        completedAt:
          new Date(),

      };

    }

    try {

      const result =
        await readRange({

          spreadsheetId:
            spreadsheet.spreadsheetId,

          range:
            context.range,

        });

      return {

        success: true,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.range,

        values:
          result.values,

        affectedRows:
          result.values.length,

        message:
          `Successfully read ${result.values.length} row(s) from "${spreadsheet.title}".`,

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

        values: [],

        affectedRows: 0,

        message:
          error instanceof Error
            ? error.message
            : "Unable to read Google Sheets.",

        completedAt:
          new Date(),

      };

    }

  }

}
