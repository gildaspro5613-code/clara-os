/**
 * ============================================
 * CLARA OS
 * Onboarding
 * --------------------------------------------
 * File : workspace-installation-result.ts
 * Responsibility :
 * Result of one workspace installation.
 * ============================================
 */

/**
 * One installation step.
 */
export interface WorkspaceInstallationStep {

  /**
   * Step name.
   */
  name: string;

  /**
   * Step status.
   */
  success: boolean;

  /**
   * Optional message.
   */
  message?: string;

}

/**
 * Workspace installation result.
 */
import type { WorkspaceSpreadsheet } from "./workspace-spreadsheet";

/**
 * Workspace installation result.
 */
export interface WorkspaceInstallationResult {

  /**
   * Installation status.
   */
  success: boolean;

  /**
   * Company folder identifier.
   */
  companyFolderId: string;

  /**
   * Number of folders created.
   */
  foldersCreated: number;

  /**
   * Real Google spreadsheets created for the workspace.
   */
  spreadsheets: WorkspaceSpreadsheet[];

  /**
   * Installation steps.
   */
  steps: WorkspaceInstallationStep[];

  /**
   * Final message.
   */
  message: string;

  /**
   * Completion date.
   */
  completedAt: Date;

}