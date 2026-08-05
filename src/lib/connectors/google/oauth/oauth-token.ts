/**
 * ============================================
 * CLARA OS
 * Google OAuth Token
 * --------------------------------------------
 * File : oauth-token.ts
 * Responsibility :
 * Exchanges an authorization code
 * for a Google Refresh Token.
 * ============================================
 */

import type { OAuth2Client } from "google-auth-library";

class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}

class TokenExchangeError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "TokenExchangeError";
    this.cause = cause;
  }
}

class MissingRefreshTokenError extends Error {
  constructor() {
    super("Token response did not include a refresh_token.");
    this.name = "MissingRefreshTokenError";
  }
}

export class GoogleOAuthToken {
  public constructor(
    private readonly client: OAuth2Client,
  ) {
    if (!client) {
      throw new InvalidArgumentError(
        "OAuth2Client is required.",
      );
    }
  }

  public async exchange(
    authorizationCode: string,
  ): Promise<string> {

    if (!authorizationCode.trim()) {
      throw new InvalidArgumentError(
        "Authorization code is required.",
      );
    }

    try {
      const response =
        await this.client.getToken(
          authorizationCode,
        );

      const refreshToken =
        response.tokens.refresh_token;

      if (!refreshToken?.trim()) {
        throw new MissingRefreshTokenError();
      }

      return refreshToken;

    } catch (error) {

      if (error instanceof MissingRefreshTokenError) {
        throw error;
      }

      throw new TokenExchangeError(
        "Unable to exchange authorization code.",
        error,
      );

    }
  }
}

export default GoogleOAuthToken;