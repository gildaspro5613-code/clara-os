import { ConnectionStatus } from "@/lib/connections/connection";
import type { ConnectionRepository } from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { OAuthError, isInvalidGrant } from "./error";
import type { OAuthTokenSet } from "./types";
import { OAuthProviderRegistry } from "./registry";
import { signOAuthState, verifyOAuthState } from "./state";

export class OAuthAuthorizationService {
  constructor(private readonly providers: OAuthProviderRegistry) {}

  create(input: {
    provider: string; connectionId: string; workspaceId: string; nonce: string;
    redirectUri: string; redirectPath: string; scopes?: readonly string[];
    parameters?: Readonly<Record<string, string>>; expiresAt?: number;
  }): URL {
    const provider = this.providers.get(input.provider);
    const state = signOAuthState({
      provider: provider.id, connectionId: input.connectionId,
      workspaceId: input.workspaceId, nonce: input.nonce,
      expiresAt: input.expiresAt ?? Date.now() + 10 * 60_000,
      redirectPath: input.redirectPath,
    });
    return provider.buildAuthorizationUrl({
      redirectUri: input.redirectUri, state,
      scopes: input.scopes ?? provider.defaultScopes,
      parameters: input.parameters,
    });
  }
}

export class OAuthCallbackService {
  constructor(
    private readonly providers: OAuthProviderRegistry,
    private readonly connections: ConnectionRepository,
    private readonly credentials: CredentialStore,
  ) {}

  async complete(input: {
    provider: string; state: string; nonce: string; code?: string | null;
    redirectUri: string; workspaceId: string;
  }): Promise<{ redirectPath: string; credentials: OAuthTokenSet }> {
    if (!input.code) throw new OAuthError("MISSING_AUTHORIZATION_CODE");
    const state = verifyOAuthState(input.state, { nonce: input.nonce, provider: input.provider });
    const connection = await this.connections.findById(state.connectionId);
    if (!connection || connection.id !== state.connectionId ||
      connection.workspaceId !== state.workspaceId || state.workspaceId !== input.workspaceId ||
      connection.provider !== input.provider) {
      throw new OAuthError("CONNECTION_MISMATCH");
    }
    let update: OAuthTokenSet;
    try {
      update = await this.providers.get(input.provider).exchangeCode({ code: input.code, redirectUri: input.redirectUri });
    } catch (error) {
      throw new OAuthError(isInvalidGrant(error) ? "INVALID_GRANT" : "CODE_EXCHANGE_FAILED");
    }
    const provider = this.providers.get(input.provider);
    const current = await this.credentials.get<OAuthTokenSet>(connection.id);
    const normalized = mergeOAuthTokens(current, update);
    if (provider.requiresRefreshToken && !normalized.refreshToken) {
      throw new OAuthError("REFRESH_UNAVAILABLE");
    }
    await this.credentials.set(connection.id, normalized);
    await this.connections.updateStatus(connection.id, ConnectionStatus.ACTIVE);
    return { redirectPath: state.redirectPath, credentials: normalized };
  }
}

export function mergeOAuthTokens(current: OAuthTokenSet | null, update: OAuthTokenSet): OAuthTokenSet {
  return { ...(current ?? {}), ...update, refreshToken: update.refreshToken ?? current?.refreshToken };
}

export function oauthCredentialsRequireRefresh(credentials: OAuthTokenSet, now = Date.now(), skewMs = 60_000): boolean {
  return credentials.expiresAt !== undefined && credentials.expiresAt <= now + skewMs;
}

export class OAuthRefreshService {
  constructor(
    private readonly providers: OAuthProviderRegistry,
    private readonly connections: ConnectionRepository,
    private readonly credentials: CredentialStore,
  ) {}

  async refreshIfNeeded(connectionId: string, providerId: string, options?: { now?: number; force?: boolean }): Promise<OAuthTokenSet> {
    const connection = await this.connections.findById(connectionId);
    if (!connection || connection.provider !== providerId) {
      throw new OAuthError("CONNECTION_MISMATCH");
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new OAuthError("CONNECTION_INACTIVE");
    }

    const current = await this.credentials.get<OAuthTokenSet>(connectionId);
    if (!current?.accessToken) throw new OAuthError("CREDENTIALS_MISSING");
    if (!options?.force && !oauthCredentialsRequireRefresh(current, options?.now)) return current;
    if (!current.refreshToken) throw new OAuthError("REFRESH_UNAVAILABLE");

    const provider = this.providers.get(providerId);
    try {
      const update = await provider.refresh({ refreshToken: current.refreshToken });
      const merged = mergeOAuthTokens(current, update);
      await this.credentials.set(connectionId, merged);
      return merged;
    } catch (error) {
      if (error instanceof OAuthError) throw error;
      throw new OAuthError(isInvalidGrant(error) ? "INVALID_GRANT" : "REFRESH_FAILED");
    }
  }
}
