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
 * Lightweight Drive resource descriptor used in search / list results.
 */
export interface DriveResourceEntry {

  /**
   * Resource identifier.
   */
  id: string;

  /**
   * Display name.
   */
  name: string;

  /**
   * MIME type (folder = `application/vnd.google-apps.folder`).
   */
  mimeType?: string;

  /**
   * Parent folder identifiers.
   */
  parents?: string[];

  /**
   * URL to open the resource in a browser.
   */
  webViewLink?: string;

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
   * File identifier (primary resource).
   */
  fileId: string;

  /**
   * File name (primary resource).
   */
  fileName: string;

  /**
   * File URL.
   */
  url?: string;

  /**
   * Binary file content (download operations).
   */
  content?: Buffer;

  /**
   * Extracted plain-text content (readContent operations).
   */
  textContent?: string;

  /**
   * File MIME type.
   */
  mimeType?: string;

  /**
   * Multiple resources returned by search / list operations.
   */
  entries?: DriveResourceEntry[];

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}
