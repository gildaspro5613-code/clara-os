/**
 * ============================================
 * CLARA OS
 * Organize Drive Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface OrganizeDriveResult {
  readonly success: boolean;
  readonly fileId: string;
  readonly folderId?: string;
  readonly folderName: string;
  readonly message: string;
  readonly completedAt: Date;
}
