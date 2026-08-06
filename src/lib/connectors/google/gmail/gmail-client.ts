/**
 * ============================================
 * CLARA OS
 * Google Gmail Client
 * --------------------------------------------
 * File : gmail-client.ts
 * Responsibility :
 * Creates the authenticated
 * Google Gmail SDK client.
 * ============================================
 */

import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";

import { GoogleAuth } from "@/lib/connectors/internal/google/auth/google-auth";

/**
 * Google Gmail client factory.
 */
export class GmailClient {

  /**
   * Creates an authenticated Google Gmail client.
   */
  public create(): gmail_v1.Gmail {

    return google.gmail({

      version: "v1",

      auth: GoogleAuth.createClient(),

    });

  }

}
