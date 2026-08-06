/**
 * ============================================
 * CLARA OS
 * Google Sheets Client
 * --------------------------------------------
 * File : sheets-client.ts
 * Responsibility :
 * Creates the authenticated
 * Google Sheets SDK client.
 * ============================================
 */

import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";

import { GoogleAuth } from "@/lib/connectors/internal/google/auth/google-auth";

/**
 * Google Sheets client factory.
 */
export class SheetsClient {

  /**
   * Creates an authenticated Google Sheets client.
   */
  public create(): sheets_v4.Sheets {

    return google.sheets({

      version: "v4",

      auth: GoogleAuth.createClient(),

    });

  }

}
