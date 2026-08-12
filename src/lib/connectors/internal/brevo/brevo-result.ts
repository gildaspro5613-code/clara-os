/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : brevo-result.ts
 * Responsibility :
 * Defines the typed results returned
 * by Brevo operations.
 * ============================================
 */

/**
 * Brevo contact statistics.
 */
export interface BrevoContactStatistics {

  /**
   * Total messages sent.
   */
  messagesSent?: number;

  /**
   * Hard bounce count.
   */
  hardBounces?: number;

  /**
   * Soft bounce count.
   */
  softBounces?: number;

  /**
   * Unsubscription count.
   */
  unsubscriptions?: number;

  /**
   * Total opens.
   */
  opens?: number;

  /**
   * Total clicks.
   */
  clicks?: number;

}

/**
 * Brevo contact.
 */
export interface BrevoContact {

  /**
   * Internal Brevo identifier.
   */
  id?: number;

  /**
   * Contact email address.
   */
  email: string;

  /**
   * Contact first name.
   */
  firstName?: string;

  /**
   * Contact last name.
   */
  lastName?: string;

  /**
   * Contact attributes.
   */
  attributes?: Record<string, unknown>;

  /**
   * Brevo list identifiers the contact belongs to.
   */
  listIds?: number[];

  /**
   * Email statistics for this contact.
   */
  statistics?: BrevoContactStatistics;

  /**
   * Contact creation date.
   */
  createdAt?: string;

  /**
   * Contact last modification date.
   */
  modifiedAt?: string;

}

/**
 * Brevo email campaign.
 */
export interface BrevoCampaign {

  /**
   * Campaign identifier.
   */
  id: number;

  /**
   * Campaign name.
   */
  name: string;

  /**
   * Campaign subject.
   */
  subject?: string;

  /**
   * Campaign status.
   */
  status: string;

  /**
   * Send date.
   */
  sentDate?: string;

  /**
   * Campaign statistics.
   */
  statistics?: Record<string, unknown>;

}

/**
 * Result returned by a Brevo operation.
 */
export interface BrevoResult {

  /**
   * Operation status.
   */
  readonly success: boolean;

  /**
   * Executed operation name.
   */
  readonly operation: string;

  /**
   * Returned contacts (list-contacts).
   */
  readonly contacts?: BrevoContact[];

  /**
   * Returned single contact (get-contact).
   */
  readonly contact?: BrevoContact;

  /**
   * Returned campaigns (list-campaigns).
   */
  readonly campaigns?: BrevoCampaign[];

  /**
   * Sent message identifier (send-email).
   */
  readonly messageId?: string;

  /**
   * Human-readable result message.
   */
  readonly message?: string;

  /**
   * Error description if the operation failed.
   */
  readonly error?: string;

  /**
   * Execution date.
   */
  readonly completedAt: Date;

}
