import type { Credentials, OAuth2Client } from "google-auth-library";
import {
  ConnectionStatus,
} from "@/lib/connections/connection";
import {
  DatabaseConnectionRepository,
  type ConnectionRepository,
} from "@/lib/connections/connection-repository";
import { CredentialStore } from "@/lib/connections/credential-store";
import { CURRENT_WORKSPACE_ID } from "@/lib/connections/current-workspace";
import {
  GoogleReauthRequiredError,
  isGoogleInvalidGrant,
} from "@/lib/connectors/google/auth/google-auth-error";
import {
  createGoogleOAuthClient,
  mergeGoogleCredentials,
} from "@/lib/connectors/google/oauth/google-oauth";

export class GoogleAuth {
  constructor(
    private readonly connections: ConnectionRepository =
      new DatabaseConnectionRepository(),
    private readonly credentials = new CredentialStore(),
    private readonly clientFactory: () => OAuth2Client = createGoogleOAuthClient,
  ) {}

  async createClient(connectionId?: string): Promise<OAuth2Client> {
    const connection = connectionId
      ? await this.connections.findById(connectionId)
      : await this.connections.findByWorkspaceAndProvider(
          CURRENT_WORKSPACE_ID,
          "google",
        );
    if (!connection || connection.status !== ConnectionStatus.ACTIVE) {
      throw new GoogleReauthRequiredError();
    }
    const stored = await this.credentials.get<Credentials>(connection.id);
    if (!stored?.refresh_token) throw new GoogleReauthRequiredError();

    const client = this.clientFactory();
    client.setCredentials(stored);
    let pendingPersistence: Promise<void> = Promise.resolve();
    client.on("tokens", (tokens) => {
      pendingPersistence = this.persistRefresh(connection.id, stored, tokens);
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
    previous: Credentials,
    update: Credentials,
  ): Promise<void> {
    const current = await this.credentials.get<Credentials>(connectionId);
    const merged = mergeGoogleCredentials(current ?? previous, update);
    await this.credentials.set(connectionId, merged);
  }
}
