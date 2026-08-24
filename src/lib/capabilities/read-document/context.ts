/**
 * ============================================
 * CLARA OS
 * Read Document Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

export interface ReadDocumentContext {

  /**
   * Google Document identifier.
   */
  readonly documentId: string;

  /**
   * Optional document title.
   */
  readonly title?: string;

}
