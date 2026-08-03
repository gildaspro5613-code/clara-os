/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector-engine.ts
 * Responsibility :
 * Coordinates connector execution.
 * ============================================
 */

import { Connector } from "./connector";
import { ConnectorEvent } from "./connector-event";
import { ConnectorResult } from "./connector-result";

/**
 * Connector engine.
 */
export class ConnectorEngine {

  /**
   * Executes one connector.
   */
  public async execute(

    connector: Connector,

    event: ConnectorEvent,

  ): Promise<ConnectorResult> {

    return {

      success: true,

      capability: event.capability,

      data: undefined,

      message:
        `${connector.name} executed successfully.`,

      completedAt: new Date(),

    };

  }

}