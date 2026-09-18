import { ConnectionStatus, type Connection } from "./connection";

export function toPublicBrevoConnection(connection: Connection | null) {
  return {
    connected: connection?.status === ConnectionStatus.ACTIVE,
    connectionId: connection?.id ?? null,
    provider: "brevo",
    status: connection?.status ?? null,
    scopes: connection?.scopes ?? [],
    connectUrl: "/api/connections/brevo/connect",
  };
}
