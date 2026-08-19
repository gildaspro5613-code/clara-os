/**
 * ============================================
 * CLARA OS
 * Find Sheet Row Capability
 * --------------------------------------------
 * Responsibility :
 * Finds rows matching a column value
 * in a Google Sheet.
 * ============================================
 */

export const FIND_SHEET_ROW_CAPABILITY =
  "find-sheet-row";

export interface FindSheetRowCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
}

export const FindSheetRowCapabilityDefinition:
  FindSheetRowCapability = {
    id: FIND_SHEET_ROW_CAPABILITY,
    name: "Find Sheet Row",
    description:
      "Finds rows matching a value in a specific column of a workspace Google Sheet.",
    version: "1.0.0",
    category: "Workspace",
  };
