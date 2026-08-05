/**
 * ============================================
 * CLARA OS
 * Google Drive Connector
 * --------------------------------------------
 * File : google-drive-result.ts
 * Responsibility :
 * Defines the result returned
 * by Google Drive operations.
 * ============================================
 */

/**
 * Google Drive result.
 */
export interface GoogleDriveResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * File identifier.
   */
  fileId: string;

  /**
   * File name.
   */
  fileName: string;

  /**
   * File URL.
   */
  url?: string;

  /**
   * File content.
   */
  content?: Buffer;

  /**
   * File MIME type.
   */
  mimeType?: string;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}
