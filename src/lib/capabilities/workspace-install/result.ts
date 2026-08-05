/**
 * ============================================
 * CLARA OS
 * Workspace Install Capability
 * --------------------------------------------
 * File : result.ts
 * Responsibility :
 * Workspace installation result.
 * ============================================
 */

export interface WorkspaceInstallResult {

  success: boolean;

  message: string;

  companyFolderId: string;

  completedAt: Date;

}