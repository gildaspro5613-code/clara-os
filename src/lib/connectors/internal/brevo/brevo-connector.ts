/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : brevo-connector.ts
 * Responsibility :
 * Defines the Brevo connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import type { BrevoContext } from "./brevo-context";
import type { BrevoResult } from "./brevo-result";

/**
 * Brevo connector.
 */
export interface BrevoConnector extends Connector {

  /**
   * Executes a Brevo operation.
   */
  execute(context: BrevoContext): Promise<BrevoResult>;

  /**
   * Lists contacts.
   */
  listContacts(context: BrevoContext): Promise<BrevoResult>;

  /**
   * Retrieves a single contact by email.
   */
  getContact(context: BrevoContext): Promise<BrevoResult>;

  /**
   * Creates a new contact.
   */
  createContact(context: BrevoContext): Promise<BrevoResult>;

  /**
   * Updates an existing contact.
   */
  updateContact(context: BrevoContext): Promise<BrevoResult>;

  /**
   * Lists email campaigns.
   */
  listCampaigns(context: BrevoContext): Promise<BrevoResult>;

  /**
   * Sends a transactional email.
   */
  sendEmail(context: BrevoContext): Promise<BrevoResult>;

}
