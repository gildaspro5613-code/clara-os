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

    if (!connector.enabled) {
      return this.failure(
        event.capability,
        `${connector.name} is disabled.`,
      );
    }

    if (!connector.capabilities.includes(event.capability)) {
      return this.failure(
        event.capability,
        `${connector.name} does not support capability: ${event.capability}.`,
      );
    }

    try {
      return await connector.execute(event);
    } catch (error: unknown) {
      return this.failure(
        event.capability,
        error instanceof Error
          ? error.message
          : "Connector execution failed with an unknown error.",
      );
    }

  }

  /**
   * Builds a standardized failed connector result.
   */
  private failure(

    capability: string,

    error: string,

  ): ConnectorResult {

    return {
      success: false,
      capability,
      error,
      completedAt: new Date(),
    };

  }

}
