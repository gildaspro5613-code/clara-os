export const ConnectionStatus = {
  PENDING_AUTHENTICATION: "PENDING_AUTHENTICATION",
  ACTIVE: "ACTIVE",
  RECONNECT_REQUIRED: "RECONNECT_REQUIRED",
  DISABLED: "DISABLED",
} as const;

export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export interface Connection {
  id: string;
  workspaceId: string;
  provider: string;
  status: ConnectionStatus;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}
