import type { OAuthProviderDefinition, OAuthTokenSet } from "@/lib/auth/oauth/types";

type Fetch = typeof fetch;
type BrevoTokenResponse = {
  access_token?: string; refresh_token?: string; token_type?: string;
  expires_in?: number; scope?: string;
};

export interface BrevoOAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  scopes?: readonly string[];
}

function normalize(value: BrevoTokenResponse, now: number): OAuthTokenSet {
  if (!value.access_token) throw new Error("invalid_token_response");
  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    tokenType: value.token_type,
    expiresAt: value.expires_in === undefined ? undefined : now + value.expires_in * 1_000,
    scope: value.scope?.split(/[ ,]+/).filter(Boolean),
  };
}

export function createBrevoOAuthProvider(
  config: BrevoOAuthConfig,
  http: Fetch = fetch,
  now: () => number = Date.now,
): OAuthProviderDefinition {
  const authorizationEndpoint = config.authorizationEndpoint ?? "https://app.brevo.com/oauth/authorize";
  const tokenEndpoint = config.tokenEndpoint ?? "https://api.brevo.com/v3/oauth/token";
  async function token(parameters: Record<string, string>): Promise<OAuthTokenSet> {
    const response = await http(tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
    });
    if (!response.ok) throw new Error(response.status === 400 ? "invalid_grant" : "token_exchange_failed");
    return normalize(await response.json() as BrevoTokenResponse, now());
  }
  return {
    id: "brevo",
    defaultScopes: config.scopes ?? [],
    buildAuthorizationUrl(request) {
      const url = new URL(authorizationEndpoint);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", config.clientId);
      url.searchParams.set("redirect_uri", request.redirectUri);
      url.searchParams.set("state", request.state);
      if (request.scopes?.length) url.searchParams.set("scope", request.scopes.join(" "));
      for (const [key, value] of Object.entries(request.parameters ?? {})) url.searchParams.set(key, value);
      return url;
    },
    exchangeCode: ({ code, redirectUri }) => token({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    refresh: ({ refreshToken }) => token({ grant_type: "refresh_token", refresh_token: refreshToken }),
  };
}

export const brevoOAuthProvider = createBrevoOAuthProvider({
  clientId: process.env.BREVO_CLIENT_ID ?? "",
  clientSecret: process.env.BREVO_CLIENT_SECRET ?? "",
  scopes: (process.env.BREVO_OAUTH_SCOPES ?? "").split(/[ ,]+/).filter(Boolean),
});
