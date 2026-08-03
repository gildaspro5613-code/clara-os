/**
 * ============================================
 * CLARA OS
 * Generate Document Capability
 * --------------------------------------------
 * File : result.ts
 * Responsibility :
 * Defines the result returned by the
 * Generate Document capability.
 * ============================================
 */

/**
 * Generate Document result.
 */
export interface GenerateDocumentResult {

  /**
   * Execution status.
   */
  readonly success: boolean;

  /**
   * Generated document identifier.
   */
  readonly documentId?: string;

  /**
   * Generated document URL.
   */
  readonly documentUrl?: string;

  /**
   * Human readable message.
   */
  readonly message: string;

  /**
   * Completion timestamp.
   */
  readonly completedAt: Date;

}