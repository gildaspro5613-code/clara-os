/**
 * ============================================
 * CLARA OS
 * Core Workspace
 * --------------------------------------------
 * Represents Clara's persistent business
 * workspace configuration.
 * ============================================
 */

import type { WorkspaceSpreadsheet } from "@/onboarding/models/workspace-spreadsheet";

/**
 * Clara persistent workspace.
 */
export interface ClaraWorkspace {

  /**
   * Company name.
   */
  companyName: string;

  /**
   * Google Drive company folder.
   */
  companyFolderId: string;

  /**
   * Google spreadsheets created for
   * the workspace.
   */
  spreadsheets: WorkspaceSpreadsheet[];

}
