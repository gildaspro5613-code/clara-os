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
 * Drive resource returned by a search or folder listing.
 */
export interface DriveResourceEntry {

  /**
   * Resource identifier.
   */
  id: string;

  /**
   * Resource name.
   */
  name: string;

  /**
   * MIME type.
   */
  mimeType?: string;

  /**
   * View URL.
   */
  webViewLink?: string;

  /**
   * Parent folder identifiers.
   */
  parents?: string[];

}

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
   * Matching Drive resources.
   */
  entries?: DriveResourceEntry[];

  /**
   * File content.
   */
  content?: Buffer;

  /**
   * File MIME type.
   */
  mimeType?: string;

  /**
   * Plain-text document content.
   */
  textContent?: string;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}
