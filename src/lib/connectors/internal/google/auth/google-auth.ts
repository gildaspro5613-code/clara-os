/**
 * ============================================
 * CLARA OS
 * Google Authentication
 * --------------------------------------------
 * File : google-auth.ts
 * Responsibility :
 * Creates and validates an
 * authenticated Google OAuth2 client.
 * ============================================
 */

import { google } from "googleapis";

import { googleConfig } from "@/lib/config/google";

/**
 * Google authentication service.
 */
export class GoogleAuth {

  /**
   * Creates an authenticated OAuth2 client.
   */
  public static createClient() {

    this.validateConfiguration();

    const client = new google.auth.OAuth2(

      googleConfig.clientId.trim(),

      googleConfig.clientSecret.trim(),

      googleConfig.redirectUri.trim(),

    );

    client.setCredentials({

      refresh_token: googleConfig.refreshToken.trim(),

    });

    return client;

  }

  /**
   * Validates Google configuration.
   */
  private static validateConfiguration(): void {

    const required = [

      ["GOOGLE_CLIENT_ID", googleConfig.clientId.trim()],

      ["GOOGLE_CLIENT_SECRET", googleConfig.clientSecret.trim()],

      ["GOOGLE_REDIRECT_URI", googleConfig.redirectUri.trim()],

      ["GOOGLE_REFRESH_TOKEN", googleConfig.refreshToken.trim()],

    ];

    for (const [name, value] of required) {

      if (!value) {

        throw new Error(

          `Missing Google configuration: ${name}`,

        );

      }

    }

  }

}