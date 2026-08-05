/**
 * ============================================
 * CLARA OS
 * Google OAuth Client
 * --------------------------------------------
 * File : oauth-client.ts
 * Responsibility :
 * Creates and configures the Google OAuth2
 * client used by Clara OS.
 * ============================================
 */

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

/**
 * Thrown when a required Google OAuth
 * environment variable is missing.
 */
class MissingEnvironmentVariableError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    variableName: string,
  ) {

    super(
      `Missing environment variable: ${variableName}`,
    );

    this.name =
      "MissingEnvironmentVariableError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Creates and configures a Google
 * OAuth2 client.
 *
 * This class only creates the client.
 * It never authenticates users,
 * requests tokens or generates
 * authorization URLs.
 */
export class GoogleOAuthClient {

  /**
   * Google Client ID.
   */
  private readonly clientId: string;

  /**
   * Google Client Secret.
   */
  private readonly clientSecret: string;

  /**
   * Google Redirect URI.
   */
  private readonly redirectUri: string;

  /**
   * OAuth2 client instance.
   */
  private readonly client: OAuth2Client;

  /**
   * Creates a configured OAuth2 client.
   */
  constructor() {

    const rawClientId =
      process.env.GOOGLE_CLIENT_ID;

    const rawClientSecret =
      process.env.GOOGLE_CLIENT_SECRET;

    const rawRedirectUri =
      process.env.GOOGLE_REDIRECT_URI;

    if (
      !rawClientId ||
      !rawClientId.trim()
    ) {

      throw new MissingEnvironmentVariableError(
        "GOOGLE_CLIENT_ID",
      );

    }

    if (
      !rawClientSecret ||
      !rawClientSecret.trim()
    ) {

      throw new MissingEnvironmentVariableError(
        "GOOGLE_CLIENT_SECRET",
      );

    }

    if (
      !rawRedirectUri ||
      !rawRedirectUri.trim()
    ) {

      throw new MissingEnvironmentVariableError(
        "GOOGLE_REDIRECT_URI",
      );

    }

    this.clientId =
      rawClientId.trim();

    this.clientSecret =
      rawClientSecret.trim();

    this.redirectUri =
      rawRedirectUri.trim();

    this.client =
      new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri,
      ) as OAuth2Client;

  }

  /**
   * Returns the configured OAuth2 client.
   */
  public getClient(): OAuth2Client {

    return this.client;

  }

}

/**
 * Default OAuth client instance.
 */
export const defaultGoogleOAuthClient =
  new GoogleOAuthClient();

export default defaultGoogleOAuthClient;