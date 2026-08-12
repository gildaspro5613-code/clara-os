/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : brevo-context.ts
 * Responsibility :
 * Defines the execution context
 * for Brevo operations.
 * ============================================
 */

/**
 * Brevo operations supported by Clara.
 */
export type BrevoOperation =
  | "list-contacts"
  | "get-contact"
  | "create-contact"
  | "update-contact"
  | "list-campaigns"
  | "send-email";

/**
 * Execution context for a Brevo operation.
 */
export interface BrevoContext {

  /**
   * Operation to execute.
   */
  operation: BrevoOperation;

  /**
   * Contact email address.
   */
  email?: string;

  /**
   * Contact first name.
   */
  firstName?: string;

  /**
   * Contact last name.
   */
  lastName?: string;

  /**
   * Contact attributes (Brevo custom fields).
   */
  attributes?: Record<string, unknown>;

  /**
   * Brevo list identifiers to assign the contact to.
   */
  listIds?: number[];

  /**
   * Email recipient address.
   */
  to?: string;

  /**
   * Email subject.
   */
  subject?: string;

  /**
   * Email plain-text body.
   */
  textBody?: string;

  /**
   * Email HTML body.
   */
  htmlBody?: string;

  /**
   * Sender name.
   */
  senderName?: string;

  /**
   * Sender email address.
   */
  senderEmail?: string;

  /**
   * Maximum number of contacts to retrieve.
   */
  limit?: number;

  /**
   * Pagination offset.
   */
  offset?: number;

}
