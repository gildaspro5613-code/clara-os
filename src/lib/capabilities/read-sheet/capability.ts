/**
 * ============================================
 * CLARA OS
 * Read Sheet Capability
 * --------------------------------------------
 * Responsibility :
 * Reads values from a Google Sheet.
 * ============================================
 */

export const READ_SHEET_CAPABILITY =
  "read-sheet";

export interface ReadSheetCapability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
}

export const ReadSheetCapabilityDefinition:
  ReadSheetCapability = {
    id: READ_SHEET_CAPABILITY,
    name: "Read Sheet",
    description:
      "Reads values from a Google Sheet range associated with the workspace.",
    version: "1.0.0",
    category: "Workspace",
  };
