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
import { getGoogleWorkspaceTokenForOrganization } from "@/lib/security/vercel-connect-google";

/**
 * Google integration.
 *
 * Organization-scoped calls use a short-lived Vercel Connect token. The
 * legacy refresh-token client is retained only for existing unscoped/internal
 * flows while the remaining callers are migrated.
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
   * Creates an organization-scoped Google client using a short-lived access
   * token supplied on demand by Vercel Connect.
   */
  public static async createOrganizationClient(organizationId: string) {
    const accessToken = await getGoogleWorkspaceTokenForOrganization(
      organizationId,
    );

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return auth;
  }

  /**
   * Tests Google authentication. When organizationId is supplied, the test is
   * performed with that organization's Vercel Connect credential.
   */
  public static async testConnection(organizationId?: string): Promise<boolean> {
    try {
      const auth = organizationId
        ? await this.createOrganizationClient(organizationId)
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
