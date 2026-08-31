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

    this.gmail = GoogleIntegration.createClient().then((auth) =>
      google.gmail({ version: "v1", auth }),
    );

  }

  /**
   * Returns Gmail profile.
   */
  public async getProfile() {

    return (await this.gmail).users.getProfile({

      userId: "me",

    });

  }

  /**
   * Lists Gmail labels.
   */
  public async listLabels() {

    return (await this.gmail).users.labels.list({

      userId: "me",

    });

  }

}
