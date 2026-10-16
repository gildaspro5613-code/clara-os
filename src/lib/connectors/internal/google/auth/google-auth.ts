import {nativeContext} from "@/lib/native/scoped-context";
import {googleAuthority,scopedGoogleCredentialStore,scopedGoogleRepository} from "@/lib/native/google-authority";
import {RegistryError} from "@/lib/canonical/registry";
import type { Credentials, OAuth2Client } from "google-auth-library";
import {
  ConnectionStatus,
} from "@/lib/connections/connection";
import {
  DatabaseConnectionRepository,
  type ConnectionRepository,
} from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import {
  GoogleReauthRequiredError,
  isGoogleInvalidGrant,
} from "@/lib/connectors/google/auth/google-auth-error";
import {
  createGoogleOAuthClient,
  toGoogleCredentials,
} from "@/lib/connectors/google/oauth/google-oauth";
import type { OAuthTokenSet } from "@/lib/auth/oauth/types";
import { mergeOAuthTokens } from "@/lib/auth/oauth/service";

export class GoogleAuth {
  constructor(
    private readonly connections: ConnectionRepository =
      new DatabaseConnectionRepository(),
    private readonly credentials = new CredentialStore(),
    private readonly clientFactory: () => OAuth2Client = createGoogleOAuthClient,
  ) {}

  async createClient(connectionId?: string): Promise<OAuth2Client> {
    if(nativeContext()) {
      if(!connectionId)throw new RegistryError(403,"NATIVE_GOOGLE_EXPLICIT_CONNECTION_REQUIRED");
      const proof=await googleAuthority(connectionId);
      const auth=new GoogleAuth(scopedGoogleRepository(connectionId),scopedGoogleCredentialStore(connectionId,proof),this.clientFactory);
      return auth.createScopedClient(connectionId,proof.subject);
    }
    return this.createUnscopedClient(connectionId);
  }

  private async createScopedClient(connectionId:string,subject:string):Promise<OAuth2Client>{
    const client=await this.createUnscopedClient(connectionId);
    const response=await client.request<{sub?:string}>({url:"https://openidconnect.googleapis.com/v1/userinfo",timeout:15_000});
    if(response.data.sub!==subject)throw new RegistryError(403,"NATIVE_GOOGLE_PRINCIPAL_CHANGED");
    return client;
  }
  private async createUnscopedClient(connectionId?:string):Promise<OAuth2Client>{
    if(!connectionId)throw new RegistryError(403,"NATIVE_GOOGLE_EXPLICIT_CONNECTION_REQUIRED");
    const connection=await this.connections.findById(connectionId);
    if (!connection || connection.status !== ConnectionStatus.ACTIVE) {
      throw new GoogleReauthRequiredError();
    }
    const stored = await this.credentials.get<OAuthTokenSet & Credentials>(connection.id);
    const usesLegacyShape = !stored?.accessToken;
    const normalized: OAuthTokenSet = !usesLegacyShape ? stored : {
      accessToken: stored?.access_token ?? "",
      refreshToken: stored?.refresh_token ?? undefined,
      tokenType: stored?.token_type ?? undefined,
      expiresAt: stored?.expiry_date ?? undefined,
      scope: stored?.scope?.split(" ").filter(Boolean),
    };
    if (!normalized.refreshToken) throw new GoogleReauthRequiredError();

    const client = this.clientFactory();
    client.setCredentials(toGoogleCredentials(normalized));
    let pendingPersistence: Promise<void> = Promise.resolve();
    client.on("tokens", (tokens) => {
      pendingPersistence = this.persistRefresh(connection.id, normalized, tokens, usesLegacyShape);
    });

    const request = client.request.bind(client);
    client.request = (async (...args: Parameters<OAuth2Client["request"]>) => {
      try {
        const response = await request(...args);
        await pendingPersistence;
        return response;
      } catch (error) {
        if (isGoogleInvalidGrant(error)) {
          await this.connections.updateStatus(
            connection.id,
            ConnectionStatus.RECONNECT_REQUIRED,
          );
          throw new GoogleReauthRequiredError();
        }
        throw error;
      }
    }) as unknown as OAuth2Client["request"];
    return client;
  }

  private async persistRefresh(
    connectionId: string,
    previous: OAuthTokenSet,
    update: Credentials,
    usesLegacyShape: boolean,
  ): Promise<void> {
    const current = await this.credentials.get<OAuthTokenSet>(connectionId);
    const merged = mergeOAuthTokens(current?.accessToken ? current : previous, {
      accessToken: update.access_token ?? current?.accessToken ?? previous.accessToken,
      refreshToken: update.refresh_token ?? undefined,
      tokenType: update.token_type ?? undefined,
      expiresAt: update.expiry_date ?? undefined,
      scope: update.scope?.split(" ").filter(Boolean),
    });
    await this.credentials.set(connectionId, usesLegacyShape ? toGoogleCredentials(merged) : merged);
  }
}
