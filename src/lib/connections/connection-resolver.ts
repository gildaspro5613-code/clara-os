import {
  ConnectionStatus,
  type Connection,
} from "./connection";
import type { ConnectionRepository } from "./connection-repository";
import type { CredentialStore } from "./credential-store";

export class ConnectionResolutionError extends Error {
  constructor(
    public readonly code:
      | "CONNECTION_NOT_FOUND"
      | "CONNECTION_PROVIDER_MISMATCH"
      | "CONNECTION_INACTIVE"
      | "CREDENTIALS_NOT_FOUND",
  ) {
    super(code);
    this.name = "ConnectionResolutionError";
  }
}

export interface ResolvedConnection<TCredentials extends object> {
  connection: Connection;
  credentials: TCredentials;
}

/** Resolves public connection metadata and separately stored credentials. */
export class ConnectionResolver {
  constructor(
    private readonly connections: ConnectionRepository,
    private readonly credentials: CredentialStore,
  ) {}

  async resolve<TCredentials extends object>(
    connectionId: string,
    provider: string,
  ): Promise<ResolvedConnection<TCredentials>> {
    const connection = await this.connections.findById(connectionId);
    if (!connection) throw new ConnectionResolutionError("CONNECTION_NOT_FOUND");
    if (connection.provider !== provider) {
      throw new ConnectionResolutionError("CONNECTION_PROVIDER_MISMATCH");
    }
    if (connection.status !== ConnectionStatus.ACTIVE) {
      throw new ConnectionResolutionError("CONNECTION_INACTIVE");
    }
    const credentials = await this.credentials.get<TCredentials>(connectionId);
    if (!credentials) throw new ConnectionResolutionError("CREDENTIALS_NOT_FOUND");
    return { connection, credentials };
  }
}
