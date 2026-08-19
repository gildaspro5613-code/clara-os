/**
 * ============================================
 * CLARA OS
 * Organize Drive Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

export interface OrganizeDriveContext {
  readonly fileId: string;
  readonly folderName: string;
  readonly parentFolderId?: string;
}
