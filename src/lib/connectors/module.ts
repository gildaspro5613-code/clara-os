/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the Connectors module.
 * ============================================
 */

import { ConnectorEngine } from "./core/connector-engine";

/**
 * Connectors module.
 */
export const CONNECTORS_MODULE = {

  id: "connectors",

  name: "Connectors",

  version: "1.0.0",

  description:
    "Provides access to external services through standardized connectors.",

  engine: new ConnectorEngine(),

} as const;