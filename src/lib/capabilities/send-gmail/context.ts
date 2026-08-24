/**
 * ============================================
 * CLARA OS
 * Send Gmail Capability
 * --------------------------------------------
 * Execution context.
 * ============================================
 */

export interface SendGmailContext {

  /**
   * Primary recipient.
   */
  readonly to: string;

  /**
   * Optional carbon-copy recipients.
   */
  readonly cc?: string[];

  /**
   * Optional blind-carbon-copy recipients.
   */
  readonly bcc?: string[];

  /**
   * Email subject.
   */
  readonly subject?: string;

  /**
   * Plain-text email body.
   */
  readonly body: string;

}
