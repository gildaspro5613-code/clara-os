/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector.ts
 * Responsibility :
 * Defines the base Connector
 * contract.
 * ============================================
 */

import { ConnectorContext } from "./connector-context";

/**
 * Base connector.
 */
export interface Connector {

  /**
   * Connector identifier.
   */
  id: string;

  /**
   * Connector name.
   */
  name: string;

  /**
   * Connector version.
   */
  version: string;

  /**
   * Connector context.
   */
  context: ConnectorContext;

  /**
   * Connector capabilities.
   */
  capabilities: string[];

  /**
   * Connector availability.
   */
  enabled: boolean;

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
