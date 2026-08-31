/**
 * ============================================
 * CLARA OS
 * Google Drive Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Google Drive
 * connector module.
 * ============================================
 */

import { GoogleDriveEngine } from "./google-drive-engine";

/**
 * Google Drive connector module.
 */
export const GOOGLE_DRIVE_MODULE = {

  id: "google-drive",

  name: "Google Drive",

  version: "1.0.0",

  description:
    "Provides access to Google Drive through Clara OS.",

  engine: new GoogleDriveEngine(),

} as const;
