/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector.ts
 * Responsibility :
 * Defines connector metadata contracts.
 * ============================================
 */

import { ConnectorContext } from "./connector-context";
import type { ConnectorEvent } from "./connector-event";
import type { ConnectorResult } from "./connector-result";

/**
 * Base connector metadata.
 */
export interface Connector {
  id: string;
  name: string;
  version: string;
  context: ConnectorContext;
  capabilities: string[];
  enabled: boolean;
}

/**
 * Generic connector contract used by ConnectorEngine.
 * Provider-specific connectors may expose their own typed execution methods
 * without being forced into this event shape.
 */
export interface ExecutableConnector extends Connector {
  execute(event: ConnectorEvent): Promise<ConnectorResult>;
}

/** The autonomy-relevant class of an operation exposed by a connector. */
export type ConnectorOperationType = "READ" | "PREPARE" | "WRITE" | "EXECUTE";

/** A declarative capability advertised by a provider adapter. */
export interface ConnectorCapabilityDefinition {
  readonly id: string;
  readonly operationType: ConnectorOperationType;
  readonly description: string;
}

/**
 * Static provider metadata. Execution remains owned by Runtime and the
 * Autonomy Gate; this definition intentionally contains no executor.
 */
export interface ConnectorDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly authentication: {
    readonly type: "oauth2" | "webhook" | "api_key";
    readonly credentialReference: "connectionId";
  };
  readonly capabilities: readonly ConnectorCapabilityDefinition[];
}
