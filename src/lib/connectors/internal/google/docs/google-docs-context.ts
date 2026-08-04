/**
 * ============================================
 * CLARA OS
 * Google Docs Connector
 * --------------------------------------------
 * File : google-docs-context.ts
 * Responsibility :
 * Defines the execution context
 * for Google Docs operations.
 * ============================================
 */

/**
 * Google Docs context.
 */
export interface GoogleDocsContext {

  /**
   * Existing document identifier.
   */
  documentId?: string;

  /**
   * Document title.
   */
  title: string;

  /**
   * Document content.
   */
  content?: string;

  /**
   * Parent Google Drive folder.
   */
  folderId?: string;

  /**
   * Optional template identifier.
   */
  templateId?: string;

  /**
   * Document language.
   */
  language?: string;

  /**
   * Custom metadata.
   */
  metadata?: Record<string, unknown>;

}