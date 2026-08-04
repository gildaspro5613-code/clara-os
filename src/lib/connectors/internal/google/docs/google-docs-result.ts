/**
 * ============================================
 * CLARA OS
 * Google Docs Connector
 * --------------------------------------------
 * File : google-docs-result.ts
 * Responsibility :
 * Defines the result returned
 * by Google Docs operations.
 * ============================================
 */

/**
 * Google Docs result.
 */
export interface GoogleDocsResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Google document identifier.
   */
  documentId: string;

  /**
   * Document title.
   */
  title: string;

  /**
   * Google Docs URL.
   */
  url?: string;

  /**
   * Exported document URL.
   */
  exportUrl?: string;

  /**
   * Optional status message.
   */
  message?: string;

  /**
   * Operation execution date.
   */
  completedAt: Date;

}