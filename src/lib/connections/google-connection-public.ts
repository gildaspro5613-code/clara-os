import { ConnectionStatus, type Connection } from "./connection";

export function toPublicGoogleConnection(connection: Connection | null) {
  return {
    connected: connection?.status === ConnectionStatus.ACTIVE,
    connectionId: connection?.id ?? null,
    provider: "google",
    status: connection?.status ?? null,
    scopes: connection?.scopes ?? [],
    connectUrl: "/api/connections/google/connect",
  };
}
