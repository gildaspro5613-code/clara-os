/**
 * ============================================
 * CLARA OS
 * Google Calendar Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Google Calendar
 * connector module.
 * ============================================
 */

import { GoogleCalendarEngine } from "./google-calendar-engine";

/**
 * Google Calendar connector module.
 */
export const GOOGLE_CALENDAR_MODULE = {

  id: "google-calendar",

  name: "Google Calendar",

  version: "1.0.0",

  description:
    "Provides access to Google Calendar through Clara OS.",

  engine: new GoogleCalendarEngine(),

} as const;