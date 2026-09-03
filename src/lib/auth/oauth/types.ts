export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  scope?: string[];
}

export interface OAuthAuthorizationRequest {
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
  parameters?: Readonly<Record<string, string>>;
}

export interface OAuthCodeExchangeRequest {
  code: string;
  redirectUri: string;
}

export interface OAuthRefreshRequest {
  refreshToken: string;
}

export interface OAuthProviderDefinition {
  readonly id: string;
  readonly defaultScopes: readonly string[];
  readonly requiresRefreshToken?: boolean;
  buildAuthorizationUrl(request: OAuthAuthorizationRequest): URL;
  exchangeCode(request: OAuthCodeExchangeRequest): Promise<OAuthTokenSet>;
  refresh(request: OAuthRefreshRequest): Promise<OAuthTokenSet>;
}

export interface OAuthStatePayload {
  provider: string;
  connectionId: string;
  workspaceId: string;
  nonce: string;
  expiresAt: number;
  redirectPath: string;
}
