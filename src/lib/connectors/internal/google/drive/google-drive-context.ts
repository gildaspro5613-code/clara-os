/**
 * ============================================
 * CLARA OS
 * Google Drive Connector
 * --------------------------------------------
 * File : google-drive-context.ts
 * Responsibility :
 * Defines the execution context
 * for Google Drive operations.
 * ============================================
 */

/**
 * Google Drive context.
 */
export interface GoogleDriveContext {

  /**
   * File identifier.
   */
  fileId?: string;

  /**
   * File name.
   */
  fileName: string;

  /**
   * Target folder.
   */
  folderId?: string;

  /**
   * File content.
   */
  content?: unknown;

  /**
   * MIME type.
   */
  mimeType?: string;

  /**
   * Free-text search query.
   */
  searchQuery?: string;

  /**
   * Sharing permissions.
   */
  permissions?: GoogleDrivePermissionInput[];

}

/**
 * Google Drive permission input.
 */
export interface GoogleDrivePermissionInput {

  /**
   * Recipient email address.
   */
  email: string;

  /**
   * Permission role.
   */
  role?: "reader" | "commenter" | "writer";

}