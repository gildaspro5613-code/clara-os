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

import type { WorkspaceSpreadsheet } from "@/onboarding/models/workspace-spreadsheet";

export interface WorkspaceInstallResult {

  success: boolean;

  message: string;

  companyFolderId: string;

  spreadsheets: WorkspaceSpreadsheet[];

  completedAt: Date;

}