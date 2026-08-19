/**
 * ============================================
 * CLARA OS
 * Append Sheet Row Capability
 * --------------------------------------------
 * Responsibility :
 * Appends one or more rows to a Google Sheet.
 * ============================================
 */

export const APPEND_SHEET_ROW_CAPABILITY =
  "append-sheet-row";

export interface AppendSheetRowCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
}

export const AppendSheetRowCapabilityDefinition:
  AppendSheetRowCapability = {
    id: APPEND_SHEET_ROW_CAPABILITY,
    name: "Append Sheet Row",
    description:
      "Appends one or more rows to an existing Google Sheet range.",
    version: "1.0.0",
    category: "Workspace",
  };
