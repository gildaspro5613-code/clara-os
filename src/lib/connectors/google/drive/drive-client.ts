/**
 * ============================================
 * CLARA OS
 * Google Drive Client
 * --------------------------------------------
 * File : drive-client.ts
 * Responsibility :
 * Creates and configures a Google Drive
 * API client from an authenticated OAuth2
 * client.
 * ============================================
 */

import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Creates and configures a Google Drive
 * API client.
 *
 * This class only creates the Drive client.
 * It never performs Drive operations,
 * authenticates users, refreshes tokens,
 * or writes credentials.
 */
export class GoogleDriveClient {

  /**
   * Configured Google Drive v3 client instance.
   */
  private readonly client: drive_v3.Drive;

  /**
   * Creates a Drive client from an
   * authenticated OAuth2 client.
   *
   * @param auth - An authenticated OAuth2Client
   *   instance supplied by the caller.
   */
  constructor(
    auth: OAuth2Client,
  ) {

    this.client = google.drive({
      version: "v3",
      auth,
    });

  }

  /**
   * Returns the configured Drive v3 client.
   *
   * @returns The `drive_v3.Drive` instance
   *   ready for use by Drive operation classes.
   */
  public getClient(): drive_v3.Drive {

    return this.client;

  }

}
