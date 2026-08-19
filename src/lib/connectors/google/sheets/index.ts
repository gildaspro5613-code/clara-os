/**
 * ============================================
 * CLARA OS
 * Google Sheets
 * --------------------------------------------
 * File : index.ts
 * Responsibility :
 * Public exports for Google Sheets
 * connector client and operations.
 * ============================================
 */

/**
 * Google Sheets connector public API exports.
 */
export { SheetsClient } from "./sheets-client";
export type { GetSheetOptions } from "./get-sheet";
export { getSheet } from "./get-sheet";
export type {
  ReadRangeOptions,
  ReadRangeResult,
} from "./read-range";
export { readRange } from "./read-range";
export type {
  SheetCellValue,
  SheetRow,
  SheetValues,
  WriteRangeOptions,
  WriteRangeResult,
} from "./write-range";
export { writeRange } from "./write-range";
export type {
  AppendRowOptions,
  AppendRowResult,
} from "./append-row";
export { appendRow } from "./append-row";
export type {
  UpdateRangeEntry,
  UpdateRangeOptions,
  UpdateRangeResult,
} from "./update-range";
export { updateRange } from "./update-range";
export type {
  ClearRangeOptions,
  ClearRangeResult,
} from "./clear-range";
export { clearRange } from "./clear-range";
export type {
  CreateSheetOptions,
  CreateSpreadsheetResult,
  CreateSpreadsheetSheet,
} from "./create-sheet";
export { createSheet } from "./create-sheet";
export type { DeleteSheetOptions } from "./delete-sheet";
export { deleteSheet } from "./delete-sheet";
export type { DeleteRowOptions } from "./delete-row";
export { deleteRow } from "./delete-row";
