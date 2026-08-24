/**
 * ============================================
 * CLARA OS
 * Workspace Folder
 * --------------------------------------------
 * Represents one real Google Drive folder
 * created during workspace installation.
 * ============================================
 */

export interface WorkspaceFolder {

  /**
   * Folder name.
   */
  name: string;

  /**
   * Google Drive folder identifier.
   */
  folderId: string;

}
