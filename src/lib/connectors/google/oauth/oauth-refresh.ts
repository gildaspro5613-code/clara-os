/**
 * ============================================
 * CLARA OS
 * Google OAuth Refresh
 * --------------------------------------------
 * File : oauth-refresh.ts
 * Responsibility :
 * Refreshes a Google Access Token
 * using an existing Refresh Token.
 * ============================================
 */

import type {
  OAuth2Client,
} from "google-auth-library";

/**
 * Thrown when an invalid argument
 * is provided.
 */
class InvalidArgumentError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    message: string,
  ) {

    super(message);

    this.name =
      "InvalidArgumentError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Thrown when no Refresh Token
 * is available.
 */
class MissingRefreshTokenError
  extends Error {

  /**
   * Creates a new error.
   */
  constructor(
    message =
      "No Refresh Token available.",
  ) {

    super(message);

    this.name =
      "MissingRefreshTokenError";

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Thrown when Google refuses
 * to refresh the Access Token.
 */
class TokenRefreshError
  extends Error {

  /**
   * Original error.
   */
  public readonly cause?: unknown;

  /**
   * Creates a new error.
   */
  constructor(
    message: string,
    cause?: unknown,
  ) {

    super(message);

    this.name =
      "TokenRefreshError";

    this.cause = cause;

    Object.setPrototypeOf(
      this,
      new.target.prototype,
    );

  }

}

/**
 * Refreshes a Google
 * Access Token.
 */
export class GoogleOAuthRefresh {

  /**
   * OAuth2 client.
   */
  private readonly client:
    OAuth2Client;

  /**
   * Creates a new refresher.
   */
  constructor(
    client: OAuth2Client,
  ) {

    if (!client) {

      throw new InvalidArgumentError(
        "OAuth2Client is required.",
      );

    }

    this.client = client;

  }

  /**
   * Returns a valid
   * Access Token.
   */
  public async refresh():
    Promise<string> {

    const refreshToken =
      this.client.credentials
        .refresh_token;

    if (!refreshToken) {

      throw new MissingRefreshTokenError();

    }

    try {

      const response =
        await this.client.getAccessToken();

      const accessToken =
        response.token;

      if (
        !accessToken ||
        !accessToken.trim()
      ) {

        throw new TokenRefreshError(
          "Google did not return an Access Token.",
        );

      }

      return accessToken;

    } catch (error) {

      throw new TokenRefreshError(
        "Unable to refresh the Access Token.",
        error,
      );

    }

  }

}

export default GoogleOAuthRefresh;