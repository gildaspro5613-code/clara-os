/**
 * ============================================
 * CLARA OS
 * Delete Sheet Row Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace spreadsheet
 * → resolve worksheet tab
 * → delete row from Google Sheets.
 * ============================================
 */

import {
  deleteRow,
  getSheet,
} from "@/lib/connectors/google/sheets";

import {
  getWorkspaceSpreadsheet,
} from "@/lib/core/workspace/workspace-resolver";

import type { DeleteSheetRowContext } from "./context";
import type { DeleteSheetRowResult } from "./result";

export class DeleteSheetRowWorkflow {

  public async execute(
    context: DeleteSheetRowContext,
  ): Promise<DeleteSheetRowResult> {

    if (!context.sheetName.trim()) {

      return {
        success: false,
        spreadsheetId: "",
        sheetName: context.sheetName,
        deletedRow: 0,
        message: "Sheet name is required.",
        completedAt: new Date(),
      };

    }

    if (
      !Number.isInteger(context.rowIndex) ||
      context.rowIndex < 2
    ) {

      return {
        success: false,
        spreadsheetId: "",
        sheetName: context.sheetName,
        deletedRow: 0,
        message:
          "rowIndex must be a spreadsheet data row greater than or equal to 2.",
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
        sheetName: context.sheetName,
        deletedRow: 0,
        message:
          `Workspace spreadsheet not found for role "${context.role}".`,
        completedAt: new Date(),
      };

    }

    try {

      const metadata =
        await getSheet({
          spreadsheetId:
            spreadsheet.spreadsheetId,
        });

      const sheet =
        metadata.sheets?.find(
          (candidate) =>
            candidate.properties?.title ===
            context.sheetName,
        );

      if (!sheet?.properties?.sheetId &&
          sheet?.properties?.sheetId !== 0) {

        return {
          success: false,
          spreadsheetId:
            spreadsheet.spreadsheetId,
          sheetName:
            context.sheetName,
          deletedRow: 0,
          message:
            `Worksheet "${context.sheetName}" not found.`,
          completedAt: new Date(),
        };

      }

      await deleteRow({

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetId:
          sheet.properties.sheetId,

        startIndex:
          context.rowIndex - 1,

        endIndex:
          context.rowIndex,

      });

      return {

        success: true,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.sheetName,

        deletedRow:
          context.rowIndex,

        message:
          `Successfully deleted row ${context.rowIndex} from "${spreadsheet.title}".`,

        completedAt:
          new Date(),

      };

    } catch (error) {

      return {

        success: false,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.sheetName,

        deletedRow:
          0,

        message:
          error instanceof Error
            ? error.message
            : "Unable to delete row from Google Sheets.",

        completedAt:
          new Date(),

      };

    }

  }

}
