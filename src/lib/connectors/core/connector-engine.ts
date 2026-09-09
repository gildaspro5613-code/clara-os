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

import {
  sendMessage,
  type SendMessageOptions,
} from "@/lib/connectors/google/gmail";
import {
  createEvent,
  type CreateEventOptions,
} from "@/lib/connectors/google/calendar";
import {
  sendMicrosoftMessage,
  type SendMicrosoftMessageOptions,
} from "@/lib/connectors/microsoft/outlook/send-message";
import {
  createMicrosoftEvent,
  type CreateMicrosoftEventOptions,
} from "@/lib/connectors/microsoft/calendar/create-event";

import { Connector } from "./connector";
import { ConnectorEvent } from "./connector-event";
import { ConnectorResult } from "./connector-result";

/**
 * Connector engine.
 *
 * Executes already-implemented connector operations behind a provider route.
 * Brain never calls providers directly: Runtime resolves the route and this
 * engine dispatches to the existing connector implementation.
 */
export class ConnectorEngine {
  /**
   * Backward-compatible connector execution entry point.
   */
  public async execute(
    connector: Connector,
    event: ConnectorEvent,
  ): Promise<ConnectorResult> {
    if (!connector.enabled) {
      return this.failure(event, `Connector ${connector.id} is disabled.`);
    }

    if (!connector.capabilities.includes(event.capability)) {
      return this.failure(
        event,
        `Connector ${connector.id} does not expose ${event.capability}.`,
      );
    }

    return this.executeRoute(connector.id, event);
  }

  /**
   * Executes a connector operation from the provider route resolved by Runtime.
   */
  public async executeRoute(
    route: string,
    event: ConnectorEvent,
  ): Promise<ConnectorResult> {
    try {
      switch (route) {
        case "google.gmail": {
          if (event.capability !== "send-email") {
            return this.unsupported(route, event);
          }

          const data = await sendMessage(event.payload as SendMessageOptions);
          return this.success(event, data, "Google Gmail executed successfully.");
        }

        case "google.calendar": {
          if (event.capability !== "schedule-event") {
            return this.unsupported(route, event);
          }

          const data = await createEvent(event.payload as CreateEventOptions);
          return this.success(event, data, "Google Calendar executed successfully.");
        }

        case "microsoft.outlook": {
          if (event.capability !== "send-email") {
            return this.unsupported(route, event);
          }

          const data = await sendMicrosoftMessage(
            event.payload as SendMicrosoftMessageOptions,
          );
          return this.success(event, data, "Microsoft Outlook executed successfully.");
        }

        case "microsoft.calendar": {
          if (event.capability !== "schedule-event") {
            return this.unsupported(route, event);
          }

          const data = await createMicrosoftEvent(
            event.payload as CreateMicrosoftEventOptions,
          );
          return this.success(event, data, "Microsoft Calendar executed successfully.");
        }

        default:
          return this.unsupported(route, event);
      }
    } catch (error) {
      return {
        success: false,
        capability: event.capability,
        message: `Connector route ${route} failed.`,
        error: error instanceof Error ? error.message : "Unknown connector error.",
        completedAt: new Date(),
      };
    }
  }

  private success(
    event: ConnectorEvent,
    data: unknown,
    message: string,
  ): ConnectorResult {
    return {
      success: true,
      capability: event.capability,
      data,
      message,
      completedAt: new Date(),
    };
  }

  private unsupported(route: string, event: ConnectorEvent): ConnectorResult {
    return this.failure(
      event,
      `Connector route ${route} does not implement ${event.capability}.`,
    );
  }

  private failure(event: ConnectorEvent, message: string): ConnectorResult {
    return {
      success: false,
      capability: event.capability,
      message,
      error: message,
      completedAt: new Date(),
    };
  }
}
