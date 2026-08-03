/**
 * ============================================
 * CLARA OS
 * Google Gmail Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Gmail connector module.
 * ============================================
 */

import { GoogleGmailEngine } from "./google-gmail-engine";

/**
 * Gmail connector module.
 */
export const GOOGLE_GMAIL_MODULE = {

  id: "google-gmail",

  name: "Google Gmail",

  version: "1.0.0",

  description:
    "Provides access to Gmail through Clara OS.",

  engine: new GoogleGmailEngine(),

} as const;