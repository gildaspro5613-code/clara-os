/**
 * ============================================
 * CLARA OS
 * Workspace Document
 * --------------------------------------------
 * Represents one real Google Document
 * created during workspace installation.
 * ============================================
 */

export interface WorkspaceDocument {

  /**
   * Logical document name.
   */
  name: string;

  /**
   * Google Document identifier.
   */
  documentId: string;

  /**
   * Google Document URL.
   */
  documentUrl: string;

}
