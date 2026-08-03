/**
 * Google Gmail result.
 */
export interface GoogleGmailResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Message identifier.
   */
  messageId?: string;

  /**
   * Conversation identifier.
   */
  threadId?: string;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Returned emails.
   */
  emails?: unknown[];

  /**
   * Execution date.
   */
  completedAt: Date;

}