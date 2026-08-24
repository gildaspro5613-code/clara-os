/**
 * ============================================
 * CLARA OS
 * Read Document Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface ReadDocumentResult {

  readonly success: boolean;

  readonly documentId: string;

  readonly title: string;

  readonly content: string;

  readonly message: string;

  readonly completedAt: Date;

}
