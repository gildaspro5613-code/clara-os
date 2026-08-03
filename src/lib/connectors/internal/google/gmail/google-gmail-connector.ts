/**
 * ============================================
 * CLARA OS
 * Google Gmail Connector
 * --------------------------------------------
 * File : google-gmail-connector.ts
 * Responsibility :
 * Defines the Gmail connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import { GoogleGmailContext } from "./google-gmail-context";
import { GoogleGmailResult } from "./google-gmail-result";

/**
 * Gmail connector.
 */
export interface GoogleGmailConnector extends Connector {

  /**
   * Connects to Gmail.
   */
  connect(): Promise<void>;

  /**
   * Sends an email.
   */
  send(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult>;

  /**
   * Reads emails.
   */
  read(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult>;

  /**
   * Searches emails.
   */
  search(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult>;

  /**
   * Deletes an email.
   */
  delete(
    context: GoogleGmailContext,
  ): Promise<GoogleGmailResult>;

}