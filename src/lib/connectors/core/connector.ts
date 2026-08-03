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