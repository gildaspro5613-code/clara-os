/**
 * ============================================
 * CLARA OS
 * Read Gmail Capability
 * --------------------------------------------
 * Responsibility :
 * Reads emails from the workspace Gmail.
 * ============================================
 */

export const READ_GMAIL_CAPABILITY =
  "read-gmail";

export interface ReadGmailCapability {

  readonly id: string;

  readonly name: string;

  readonly description: string;

  readonly version: string;

  readonly category: string;

}

export const ReadGmailCapabilityDefinition:
  ReadGmailCapability = {

  id:
    READ_GMAIL_CAPABILITY,

  name:
    "Read Gmail",

  description:
    "Reads emails from the workspace Gmail inbox.",

  version:
    "1.0.0",

  category:
    "Workspace",

};
