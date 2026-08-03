/**
 * ============================================
 * CLARA OS
 * Google Docs Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Google Docs
 * connector module.
 * ============================================
 */

import { GoogleDocsEngine } from "./google-docs-engine";

/**
 * Google Docs connector module.
 */
export const GOOGLE_DOCS_MODULE = {

  /**
   * Module identity.
   */
  id: "google-docs",

  name: "Google Docs",

  version: "1.0.0",

  description:
    "Provides access to Google Docs through Clara OS.",

  /**
   * Connector engine.
   */
  engine: new GoogleDocsEngine(),

} as const;