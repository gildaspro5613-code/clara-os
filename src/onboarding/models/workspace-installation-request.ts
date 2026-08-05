/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : workspace-installation-request.ts
 * Responsibility :
 * Defines the workspace
 * installation request.
 * ============================================
 */

/**
 * Workspace installation request.
 */
export interface WorkspaceInstallationRequest {

  /**
   * Company name.
   */
  companyName: string;

  /**
   * Workspace template identifier.
   */
  workspaceTemplate?: string;

}