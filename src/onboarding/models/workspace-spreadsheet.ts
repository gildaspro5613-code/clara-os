/**
 * ============================================
 * CLARA OS
 * Workspace Spreadsheet
 * --------------------------------------------
 * Represents one real Google Spreadsheet
 * created during workspace installation.
 * ============================================
 */

export type WorkspaceSpreadsheetRole =
  | "crm"
  | "prospects"
  | "clients"
  | "production";

export interface WorkspaceSpreadsheet {
  role: WorkspaceSpreadsheetRole;
  title: string;
  spreadsheetId: string;
}
