/**
 * ============================================
 * CLARA OS
 * Google Workspace
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Google Workspace
 * connector ecosystem.
 * ============================================
 */

import { GOOGLE_SHEETS_MODULE } from "./sheets/module";
import { GOOGLE_DOCS_MODULE } from "./docs/module";
import { GOOGLE_DRIVE_MODULE } from "./drive/module";
import { GOOGLE_GMAIL_MODULE } from "./gmail/module";
import { GOOGLE_CALENDAR_MODULE } from "./calendar/module";

/**
 * Google Workspace module.
 */
export const GOOGLE_MODULE = {

  /**
   * Module identity.
   */
  id: "google",

  name: "Google Workspace",

  version: "1.0.0",

  description:
    "Provides access to Google Workspace services through Clara OS.",

  /**
   * Workspace services.
   */
  sheets: GOOGLE_SHEETS_MODULE,

  docs: GOOGLE_DOCS_MODULE,

  drive: GOOGLE_DRIVE_MODULE,

  gmail: GOOGLE_GMAIL_MODULE,

  calendar: GOOGLE_CALENDAR_MODULE,

} as const;