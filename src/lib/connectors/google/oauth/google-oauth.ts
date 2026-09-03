import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { googleConfig } from "@/lib/config/google";
import type { OAuthProviderDefinition, OAuthTokenSet } from "@/lib/auth/oauth/types";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
] as const;

export function createGoogleOAuthClient() {
  if (!googleConfig.clientId || !googleConfig.clientSecret || !googleConfig.redirectUri) {
    throw new Error("Google OAuth server configuration is incomplete.");
  }
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirectUri,
  );
}

export function mergeGoogleCredentials(
  current: Credentials | null,
  update: Credentials,
): Credentials {
  return {
    ...(current ?? {}),
    ...update,
    refresh_token: update.refresh_token ?? current?.refresh_token,
  };
}

function normalizeGoogleCredentials(tokens: Credentials): OAuthTokenSet {
  if (!tokens.access_token) throw new Error("invalid_token_response");
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    tokenType: tokens.token_type ?? undefined,
    expiresAt: tokens.expiry_date ?? undefined,
    scope: tokens.scope?.split(" ").filter(Boolean),
  };
}

export function toGoogleCredentials(tokens: OAuthTokenSet): Credentials {
  return {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: tokens.tokenType,
    expiry_date: tokens.expiresAt,
    scope: tokens.scope?.join(" "),
  };
}

export const googleOAuthProvider: OAuthProviderDefinition = {
  id: "google",
  defaultScopes: GOOGLE_OAUTH_SCOPES,
  requiresRefreshToken: true,
  buildAuthorizationUrl(request) {
    return new URL(createGoogleOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: [...(request.scopes ?? GOOGLE_OAUTH_SCOPES)],
      state: request.state,
      ...request.parameters,
    }));
  },
  async exchangeCode(request) {
    const { tokens } = await createGoogleOAuthClient().getToken({
      code: request.code,
      redirect_uri: request.redirectUri,
    });
    return normalizeGoogleCredentials(tokens);
  },
  async refresh(request) {
    const client = createGoogleOAuthClient();
    client.setCredentials({ refresh_token: request.refreshToken });
    const { credentials } = await client.refreshAccessToken();
    return normalizeGoogleCredentials(credentials);
  },
};
