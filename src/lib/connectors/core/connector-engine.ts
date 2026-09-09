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
  getFile,
  uploadFile,
  type UploadFileOptions,
} from "@/lib/connectors/google/drive";
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import type { OpenAIResponsesContext } from "@/lib/connectors/internal/openai/responses/openai-responses-context";
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

  public async executeRoute(
    route: string,
    event: ConnectorEvent,
  ): Promise<ConnectorResult> {
    try {
      switch (route) {
        case "google.gmail": {
          if (event.capability !== "send-email") return this.unsupported(route, event);
          const data = await sendMessage(event.payload as SendMessageOptions);
          return this.success(event, data, "Google Gmail executed successfully.");
        }

        case "google.calendar": {
          if (event.capability !== "schedule-event") return this.unsupported(route, event);
          const data = await createEvent(event.payload as CreateEventOptions);
          return this.success(event, data, "Google Calendar executed successfully.");
        }

        case "google.drive": {
          if (event.capability === "store-file") {
            const data = await uploadFile(event.payload as UploadFileOptions);
            return this.success(event, data, "Google Drive file stored successfully.");
          }

          if (event.capability === "retrieve-file") {
            const payload = event.payload as { fileId?: unknown };
            if (!payload || typeof payload.fileId !== "string" || !payload.fileId) {
              return this.failure(event, "Google Drive retrieve-file requires fileId.");
            }
            const data = await getFile(payload.fileId);
            return this.success(event, data, "Google Drive file retrieved successfully.");
          }

          return this.unsupported(route, event);
        }

        case "openai.responses": {
          if (event.capability !== "generate-text") return this.unsupported(route, event);
          const result = await new OpenAIResponsesEngine().generate(
            event.payload as OpenAIResponsesContext,
          );
          if (!result.success) {
            return this.failure(event, result.message ?? "OpenAI Responses failed.");
          }
          return this.success(event, result, "OpenAI Responses executed successfully.");
        }

        case "google.calendar": {
          return this.unsupported(route, event);
        }

        case "microsoft.outlook": {
          if (event.capability !== "send-email") return this.unsupported(route, event);
          const data = await sendMicrosoftMessage(
            event.payload as SendMicrosoftMessageOptions,
          );
          return this.success(event, data, "Microsoft Outlook executed successfully.");
        }

        case "microsoft.calendar": {
          if (event.capability !== "schedule-event") return this.unsupported(route, event);
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

  private success(event: ConnectorEvent, data: unknown, message: string): ConnectorResult {
    return { success: true, capability: event.capability, data, message, completedAt: new Date() };
  }

  private unsupported(route: string, event: ConnectorEvent): ConnectorResult {
    return this.failure(event, `Connector route ${route} does not implement ${event.capability}.`);
  }

  private failure(event: ConnectorEvent, message: string): ConnectorResult {
    return { success: false, capability: event.capability, message, error: message, completedAt: new Date() };
  }
}
