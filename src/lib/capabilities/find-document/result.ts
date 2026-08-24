/**
 * ============================================
 * CLARA OS
 * Find Document Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface FindDocumentResult {

  readonly success: boolean;

  readonly documentId?: string;

  readonly documentName?: string;

  readonly documentUrl?: string;

  readonly message: string;

  readonly completedAt: Date;

}
