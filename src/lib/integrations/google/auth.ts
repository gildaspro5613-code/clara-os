/**
 * ============================================
 * CLARA OS
 * Google Integration
 * --------------------------------------------
 * File : auth.ts
 * Responsibility :
 * Creates and validates an
 * authenticated Google OAuth2 client.
 * ============================================
 */

import { google } from "googleapis";
import { googleConfig } from "@/lib/config/google";

/**
 * Google integration.
 */
export class GoogleIntegration {

  /**
   * Creates an authenticated OAuth2 client.
   */
  public static createClient() {

    this.validateConfiguration();

    const auth = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri,
    );

    auth.setCredentials({
      refresh_token: googleConfig.refreshToken,
    });

    return auth;

  }

  /**
   * Tests Google authentication.
   */
  public static async testConnection(): Promise<boolean> {

    try {

      const auth = this.createClient();

      const drive = google.drive({

        version: "v3",

        auth,

      });

      await drive.about.get({

        fields: "user",

      });

      return true;

    } catch (error) {

      console.error(error);

      return false;

    }

  }

  /**
   * Validates configuration.
   */
  private static validateConfiguration(): void {

    const required = [

      ["GOOGLE_CLIENT_ID", googleConfig.clientId],

      ["GOOGLE_CLIENT_SECRET", googleConfig.clientSecret],

      ["GOOGLE_REDIRECT_URI", googleConfig.redirectUri],

      ["GOOGLE_REFRESH_TOKEN", googleConfig.refreshToken],

    ];

    for (const [key, value] of required) {

      if (!value) {

        throw new Error(
          `Missing Google configuration: ${key}`,
        );

      }

    }

  }

}