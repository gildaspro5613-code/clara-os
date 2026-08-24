/**
 * ============================================
 * CLARA OS
 * Send Gmail Capability
 * --------------------------------------------
 * Responsibility :
 * Sends an email through the workspace Gmail.
 * ============================================
 */

export const SEND_GMAIL_CAPABILITY =
  "send-gmail";

export interface SendGmailCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const SendGmailCapabilityDefinition:
  SendGmailCapability = {

  id:
    SEND_GMAIL_CAPABILITY,

  name:
    "Send Gmail",

  description:
    "Sends an email through the workspace Gmail account.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
