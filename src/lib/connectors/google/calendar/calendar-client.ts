/**
 * ============================================
 * CLARA OS
 * Google Calendar Client
 * --------------------------------------------
 * File : calendar-client.ts
 * Responsibility :
 * Creates the authenticated
 * Google Calendar SDK client.
 * ============================================
 */

import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

import { GoogleAuth } from "@/lib/connectors/internal/google/auth/google-auth";

/**
 * Google Calendar client factory.
 */
export class CalendarClient {

  /**
   * Creates an authenticated Google Calendar client.
   */
  public async create(): Promise<calendar_v3.Calendar> {

    return google.calendar({

      version: "v3",

      auth: await new GoogleAuth().createClient(),

    });

  }

}
