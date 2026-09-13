/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector-engine.ts
 * Responsibility :
 * Coordinates generic connector execution.
 * ============================================
 */

import type { ExecutableConnector } from "./connector";
import type { ConnectorEvent } from "./connector-event";
import type { ConnectorResult } from "./connector-result";

/**
 * Connector engine.
 */
export class ConnectorEngine {
  /**
   * Executes one generic connector capability.
   */
  public async execute(
    connector: ExecutableConnector,
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
