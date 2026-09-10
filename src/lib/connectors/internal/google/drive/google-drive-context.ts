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
   * Sharing permissions.
   */
  permissions?: GoogleDrivePermissionInput[];

  /**
   * Free-text search query.
   * Used by search() to locate resources by name or content.
   */
  searchQuery?: string;

  /**
   * Destination folder for move operations.
   */
  destinationFolderId?: string;

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