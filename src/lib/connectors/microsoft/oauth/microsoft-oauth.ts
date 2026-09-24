import type { OAuthProviderDefinition, OAuthTokenSet } from "@/lib/auth/oauth/types";
import { microsoftConfig } from "@/lib/config/microsoft";

const MICROSOFT_AUTHORIZE_URL = "https://login.microsoftonline.com";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com";

export const MICROSOFT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "CloudPC.Read.All",
] as const;

function tenantBaseUrl() {
  return `${MICROSOFT_AUTHORIZE_URL}/${encodeURIComponent(microsoftConfig.tenantId)}/oauth2/v2.0`;
}

async function exchangeToken(body: URLSearchParams): Promise<OAuthTokenSet> {
  if (!microsoftConfig.clientId || !microsoftConfig.clientSecret || !microsoftConfig.redirectUri) {
    throw new Error("Microsoft OAuth server configuration is incomplete.");
  }

  const response = await fetch(
    `${MICROSOFT_TOKEN_URL}/${encodeURIComponent(microsoftConfig.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? "Microsoft OAuth token exchange failed.");
  }

  const grantedScopes = data.scope?.split(" ").filter(Boolean) ?? [];
  const required = ["User.Read", "CloudPC.Read.All"];
  if (!required.every((scope) => grantedScopes.some((granted) => granted.toLowerCase() === scope.toLowerCase()))) {
    throw new Error("Microsoft OAuth did not grant the required Windows 365 scopes.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    scope: grantedScopes,
  };
}

export const microsoftOAuthProvider: OAuthProviderDefinition = {
  id: "microsoft",
  defaultScopes: MICROSOFT_OAUTH_SCOPES,
  requiresRefreshToken: true,

  buildAuthorizationUrl(request) {
    if (!microsoftConfig.clientId) {
      throw new Error("Microsoft OAuth client ID is missing.");
    }

    const url = new URL(`${tenantBaseUrl()}/authorize`);
    url.searchParams.set("client_id", microsoftConfig.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", request.redirectUri);
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", (request.scopes ?? MICROSOFT_OAUTH_SCOPES).join(" "));
    url.searchParams.set("state", request.state);

    for (const [key, value] of Object.entries(request.parameters ?? {})) {
      url.searchParams.set(key, value);
    }

    return url;
  },

  exchangeCode(request) {
    return exchangeToken(new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      grant_type: "authorization_code",
      code: request.code,
      redirect_uri: request.redirectUri,
      scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    }));
  },

  refresh(request) {
    return exchangeToken(new URLSearchParams({
      client_id: microsoftConfig.clientId,
      client_secret: microsoftConfig.clientSecret,
      grant_type: "refresh_token",
      refresh_token: request.refreshToken,
      redirect_uri: microsoftConfig.redirectUri,
      scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    }));
  },
};
