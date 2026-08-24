/**
 * ============================================
 * CLARA OS
 * Find Sheet Row Capability
 * --------------------------------------------
 * Workflow :
 * resolve workspace spreadsheet
 * → read range
 * → identify header
 * → find matching rows.
 * ============================================
 */

import { readRange } from "@/lib/connectors/google/sheets";

import {
  getWorkspaceSpreadsheet,
} from "@/lib/core/workspace/workspace-resolver";

import type { FindSheetRowContext } from "./context";
import type { FindSheetRowResult } from "./result";

export class FindSheetRowWorkflow {

  public async execute(
    context: FindSheetRowContext,
  ): Promise<FindSheetRowResult> {

    if (!context.range.trim()) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: "",

        rows: [],

        rowIndexes: [],

        matchedRows: 0,

        message:
          "Target range is required.",

        completedAt:
          new Date(),

      };

    }

    if (!context.column.trim()) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: context.range,

        rows: [],

        rowIndexes: [],

        matchedRows: 0,

        message:
          "Search column is required.",

        completedAt:
          new Date(),

      };

    }

    if (!context.value.trim()) {

      return {

        success: false,

        spreadsheetId: "",

        sheetName: context.range,

        rows: [],

        rowIndexes: [],

        matchedRows: 0,

        message:
          "Search value is required.",

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

        rows: [],

        rowIndexes: [],

        matchedRows: 0,

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

      const values =
        result.values;

      if (values.length === 0) {

        return {

          success: true,

          spreadsheetId:
            spreadsheet.spreadsheetId,

          sheetName:
            context.range,

          rows: [],

          rowIndexes: [],

          matchedRows: 0,

          message:
            `No rows found in "${spreadsheet.title}".`,

          completedAt:
            new Date(),

        };

      }

      const headers =
        values[0].map(
          (header) =>
            String(header).trim(),
        );

      const columnIndex =
        headers.findIndex(
          (header) =>
            header.toLowerCase() ===
            context.column.trim().toLowerCase(),
        );

      if (columnIndex === -1) {

        return {

          success: false,

          spreadsheetId:
            spreadsheet.spreadsheetId,

          sheetName:
            context.range,

          rows: [],

          rowIndexes: [],

          matchedRows: 0,

          message:
            `Column "${context.column}" not found.`,

          completedAt:
            new Date(),

        };

      }

      const normalizedValue =
        context.value
          .trim()
          .toLowerCase();

      const matches =
        values
          .slice(1)
          .map((row, index) => ({
            row,
            rowIndex: index + 2,
          }))
          .filter(
            ({ row }) =>
              String(
                row[columnIndex] ?? "",
              )
                .trim()
                .toLowerCase() ===
              normalizedValue,
          );

      const matchedRows =
        matches.map(
          (match) => match.row,
        );

      const rowIndexes =
        matches.map(
          (match) => match.rowIndex,
        );

      return {

        success: true,

        spreadsheetId:
          spreadsheet.spreadsheetId,

        sheetName:
          context.range,

        rows:
          matchedRows,

        rowIndexes,

        matchedRows:
          matchedRows.length,

        message:
          `Found ${matchedRows.length} matching row(s) in "${spreadsheet.title}".`,

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

        rows: [],

        rowIndexes: [],

        matchedRows: 0,

        message:
          error instanceof Error
            ? error.message
            : "Unable to search Google Sheets.",

        completedAt:
          new Date(),

      };

    }

  }

}
