/**
 * ============================================
 * CLARA OS
 * Google Sheets Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Google Sheets
 * connector module.
 * ============================================
 */

import { GoogleSheetsEngine } from "./google-sheets-engine";

/**
 * Google Sheets connector module.
 */
export const GOOGLE_SHEETS_MODULE = {

  /**
   * Module identity.
   */
  id: "google-sheets",

  name: "Google Sheets",

  version: "1.0.0",

  description:
    "Provides access to Google Sheets through Clara OS.",

  /**
   * Connector engine.
   */
  engine: new GoogleSheetsEngine(),

} as const;