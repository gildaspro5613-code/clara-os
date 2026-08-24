/**
 * ============================================
 * CLARA OS
 * Core Workspace
 * --------------------------------------------
 * Represents Clara's persistent business
 * workspace configuration.
 * ============================================
 */

import type { WorkspaceCalendar } from "@/onboarding/models/workspace-calendar";
import type { WorkspaceDocument } from "@/onboarding/models/workspace-document";
import type { WorkspaceFolder } from "@/onboarding/models/workspace-folder";
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
   * Google Drive folders created for
   * the workspace.
   */
  folders: WorkspaceFolder[];

  /**
   * Google Calendar created for
   * the workspace.
   */
  calendar: WorkspaceCalendar;

  /**
   * Google Documents created for
   * the workspace.
   */
  documents: WorkspaceDocument[];

  /**
   * Google spreadsheets created for
   * the workspace.
   */
  spreadsheets: WorkspaceSpreadsheet[];

}
