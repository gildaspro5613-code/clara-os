/**
 * ============================================
 * CLARA OS
 * Google Integration
 * --------------------------------------------
 * File : auth.ts
 * Responsibility :
 * Creates authenticated Google clients.
 * ============================================
 */

import { google } from "googleapis";
import { googleConfig } from "@/lib/config/google";
import { getGoogleWorkspaceTokenForUser } from "@/lib/security/vercel-connect-google";

/**
 * Google integration.
 *
 * User-scoped calls use a short-lived Vercel Connect token. The legacy
 * refresh-token client is retained only for existing unscoped/internal flows
 * while the remaining callers are migrated.
 */
export class GoogleIntegration {
  /**
   * Creates the legacy authenticated OAuth2 client.
   */
  public static createClient() {
    this.validateLegacyConfiguration();

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
   * Creates a user-scoped Google client using a short-lived access token
   * supplied on demand by Vercel Connect.
   */
  public static async createUserClient(userId: string) {
    const accessToken = await getGoogleWorkspaceTokenForUser(userId);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
  }

  /**
   * Tests Google authentication. When userId is supplied, the test is
   * performed with that user's Vercel Connect credential.
   */
  public static async testConnection(userId?: string): Promise<boolean> {
    try {
      const auth = userId
        ? await this.createUserClient(userId)
        : this.createClient();

      const drive = google.drive({ version: "v3", auth });
      await drive.about.get({ fields: "user" });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  private static validateLegacyConfiguration(): void {
    const required = [
      ["GOOGLE_CLIENT_ID", googleConfig.clientId],
      ["GOOGLE_CLIENT_SECRET", googleConfig.clientSecret],
      ["GOOGLE_REDIRECT_URI", googleConfig.redirectUri],
      ["GOOGLE_REFRESH_TOKEN", googleConfig.refreshToken],
    ];

    for (const [key, value] of required) {
      if (!value) {
        throw new Error(`Missing Google configuration: ${key}`);
      }
    }
  }
}
