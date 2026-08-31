/**
 * ============================================
 * CLARA OS
 * Google Drive Client
 * --------------------------------------------
 * File : drive-client.ts
 * Responsibility :
 * Creates the authenticated
 * Google Drive SDK client.
 * ============================================
 */

import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

import { GoogleAuth } from "../auth/google-auth";

/**
 * Google Drive client factory.
 */
export class DriveClient {

  /**
   * Creates an authenticated Drive client.
   */
  public async create(): Promise<drive_v3.Drive> {

    return google.drive({

      version: "v3",

      auth: await new GoogleAuth().createClient(),

    });

  }

}
