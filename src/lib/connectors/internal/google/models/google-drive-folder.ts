/**
 * ============================================
 * CLARA OS
 * Google Drive Integration
 * --------------------------------------------
 * File : google-drive-folder.ts
 * Responsibility :
 * Represents one Google Drive folder.
 * ============================================
 */

/**
 * Google Drive folder.
 */
export interface GoogleDriveFolder {

  /**
   * Folder identifier.
   */
  id: string;

  /**
   * Folder name.
   */
  name: string;

  /**
   * Parent folder identifier.
   */
  parentId?: string;

}