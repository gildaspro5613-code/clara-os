/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : workspace-installation-result.ts
 * Responsibility :
 * Defines the result of a workspace
 * installation.
 * ============================================
 */

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
   * Installation message.
   */
  message: string;

  /**
   * Completion date.
   */
  completedAt: Date;

}