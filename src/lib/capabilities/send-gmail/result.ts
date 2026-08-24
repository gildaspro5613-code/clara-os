/**
 * ============================================
 * CLARA OS
 * Send Gmail Capability
 * --------------------------------------------
 * Execution result.
 * ============================================
 */

export interface SendGmailResult {

  readonly success: boolean;

  readonly messageId?: string;

  readonly threadId?: string;

  readonly message: string;

  readonly completedAt: Date;

}
