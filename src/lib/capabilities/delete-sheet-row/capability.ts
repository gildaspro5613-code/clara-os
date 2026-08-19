/**
 * ============================================
 * CLARA OS
 * Delete Sheet Row Capability
 * --------------------------------------------
 * Deletes one or more rows from a workspace
 * Google Sheet.
 * ============================================
 */

export const DELETE_SHEET_ROW_CAPABILITY =
  "delete-sheet-row";

export interface DeleteSheetRowCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
}

export const DeleteSheetRowCapabilityDefinition:
  DeleteSheetRowCapability = {
    id: DELETE_SHEET_ROW_CAPABILITY,
    name: "Delete Sheet Row",
    description:
      "Deletes one or more rows from a workspace Google Sheet.",
    version: "1.0.0",
    category: "Workspace",
  };
