/**
 * ============================================
 * CLARA OS
 * Google Configuration
 * --------------------------------------------
 * File : google.ts
 * Responsibility :
 * Centralizes Google Workspace
 * configuration.
 * ============================================
 */

/**
 * Google configuration.
 */
export const googleConfig = {

  /**
   * Google Cloud Project ID.
   */
  projectId:
    process.env.GOOGLE_PROJECT_ID ?? "",

  /**
   * OAuth Client ID.
   */
  clientId:
    process.env.GOOGLE_CLIENT_ID ?? "",

  /**
   * OAuth Client Secret.
   */
  clientSecret:
    process.env.GOOGLE_CLIENT_SECRET ?? "",

  /**
   * OAuth Redirect URI.
   */
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI ?? "",

} as const;
