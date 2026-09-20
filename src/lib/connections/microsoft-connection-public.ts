import { ConnectionStatus, type Connection } from "./connection";

export function toPublicMicrosoftConnection(connection: Connection | null) {
  return {
    connected: connection?.status === ConnectionStatus.ACTIVE,
    connectionId: connection?.id ?? null,
    provider: "microsoft",
    status: connection?.status ?? null,
    scopes: connection?.scopes ?? [],
    connectUrl: "/api/connections/microsoft/connect",
  };
}
