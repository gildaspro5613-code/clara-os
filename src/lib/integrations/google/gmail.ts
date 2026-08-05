/**
 * ============================================
 * CLARA OS
 * Google Gmail Integration
 * --------------------------------------------
 * File : gmail.ts
 * Responsibility :
 * Provides access to the
 * Gmail API.
 * ============================================
 */

import { google } from "googleapis";

import { GoogleIntegration } from "./auth";

/**
 * Google Gmail integration.
 */
export class GoogleGmailIntegration {

  /**
   * Gmail API.
   */
  private readonly gmail;

  /**
   * Constructor.
   */
  constructor() {

    const auth = GoogleIntegration.createClient();

    this.gmail = google.gmail({

      version: "v1",

      auth,

    });

  }

  /**
   * Returns Gmail profile.
   */
  public async getProfile() {

    return this.gmail.users.getProfile({

      userId: "me",

    });

  }

  /**
   * Lists Gmail labels.
   */
  public async listLabels() {

    return this.gmail.users.labels.list({

      userId: "me",

    });

  }

}