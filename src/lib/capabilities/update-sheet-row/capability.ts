/**
 * ============================================
 * CLARA OS
 * Update Sheet Row Capability
 * --------------------------------------------
 * Responsibility :
 * Updates existing values in a Google Sheet.
 * ============================================
 */

export const UPDATE_SHEET_ROW_CAPABILITY =
  "update-sheet-row";

export interface UpdateSheetRowCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
}

export const UpdateSheetRowCapabilityDefinition:
  UpdateSheetRowCapability = {
    id: UPDATE_SHEET_ROW_CAPABILITY,
    name: "Update Sheet Row",
    description:
      "Updates existing values in a specific Google Sheet range.",
    version: "1.0.0",
    category: "Workspace",
  };
