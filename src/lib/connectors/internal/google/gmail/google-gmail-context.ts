/**
 * Google Gmail context.
 */
export interface GoogleGmailContext {

  /**
   * Email identifier.
   */
  messageId?: string;

  /**
   * Recipient.
   */
  to?: string;

  /**
   * Carbon copy.
   */
  cc?: string[];

  /**
   * Blind carbon copy.
   */
  bcc?: string[];

  /**
   * Email subject.
   */
  subject?: string;

  /**
   * Email body.
   */
  body?: string;

  /**
   * Search query.
   */
  query?: string;

}