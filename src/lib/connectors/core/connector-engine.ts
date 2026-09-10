/**
 * ============================================
 * CLARA OS
 * Connectors Module
 * --------------------------------------------
 * File : connector-engine.ts
 * Responsibility : Coordinates connector execution.
 * ============================================
 */

import { createEvent, type CreateEventOptions } from "@/lib/connectors/google/calendar";
import {
  createDocument,
  getDocument,
  type CreateDocumentOptions,
  type GetDocumentOptions,
} from "@/lib/connectors/google/docs";
import { getFile, uploadFile, type UploadFileOptions } from "@/lib/connectors/google/drive";
import { sendMessage, type SendMessageOptions } from "@/lib/connectors/google/gmail";
import {
  readRange,
  writeRange,
  type ReadRangeOptions,
  type WriteRangeOptions,
} from "@/lib/connectors/google/sheets";
import {
  runWithGoogleRuntimeToken,
} from "@/lib/connectors/internal/google/auth/google-runtime-token-context";
import { getElevenLabsSignedUrl } from "@/lib/connectors/internal/elevenlabs";
import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import type { OpenAIResponsesContext } from "@/lib/connectors/internal/openai/responses/openai-responses-context";
import { createMicrosoftEvent, type CreateMicrosoftEventOptions } from "@/lib/connectors/microsoft/calendar/create-event";
import { sendMicrosoftMessage, type SendMicrosoftMessageOptions } from "@/lib/connectors/microsoft/outlook/send-message";
import { resolveOrganizationId } from "@/lib/core/organization-context";
import { getGoogleWorkspaceTokenForOrganization } from "@/lib/security/vercel-connect-google";
import type { Locale } from "@/i18n/types";

import { Connector } from "./connector";
import { ConnectorEvent } from "./connector-event";
import { ConnectorResult } from "./connector-result";

const CLARA_LOCALES = new Set<Locale>(["fr", "en", "es", "de", "it"]);

/**
 * Executes already-implemented native connector operations behind provider
 * routes. Brain remains provider-neutral.
 */
export class ConnectorEngine {
  public async execute(connector: Connector, event: ConnectorEvent): Promise<ConnectorResult> {
    if (!connector.enabled) return this.failure(event, `Connector ${connector.id} is disabled.`);
    if (!connector.capabilities.includes(event.capability)) {
      return this.failure(event, `Connector ${connector.id} does not expose ${event.capability}.`);
    }
    return this.executeRoute(connector.id, event);
  }

  public async executeRoute(
    route: string,
    event: ConnectorEvent,
    googleTokenBound = false,
  ): Promise<ConnectorResult> {
    try {
      if (!googleTokenBound && route.startsWith("google.")) {
        const organizationId = resolveOrganizationId(event.payload);

        if (organizationId) {
          const accessToken = await getGoogleWorkspaceTokenForOrganization(organizationId);

          return runWithGoogleRuntimeToken(
            { organizationId, accessToken },
            () => this.executeRoute(route, event, true),
          );
        }
      }

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
        case "google.docs": {
          if (event.capability === "create-document") {
            const data = await createDocument(event.payload as CreateDocumentOptions);
            return this.success(event, data, "Google Docs document created successfully.");
          }
          if (event.capability === "retrieve-document") {
            const data = await getDocument(event.payload as GetDocumentOptions);
            return this.success(event, data, "Google Docs document retrieved successfully.");
          }
          return this.unsupported(route, event);
        }
        case "google.sheets": {
          if (event.capability === "read-spreadsheet-range") {
            const data = await readRange(event.payload as ReadRangeOptions);
            return this.success(event, data, "Google Sheets range read successfully.");
          }
          if (event.capability === "write-spreadsheet-range") {
            const data = await writeRange(event.payload as WriteRangeOptions);
            return this.success(event, data, "Google Sheets range written successfully.");
          }
          return this.unsupported(route, event);
        }
        case "openai.responses": {
          if (event.capability !== "generate-text") return this.unsupported(route, event);
          const result = await new OpenAIResponsesEngine().generate(event.payload as OpenAIResponsesContext);
          if (!result.success) return this.failure(event, result.message ?? "OpenAI Responses failed.");
          return this.success(event, result, "OpenAI Responses executed successfully.");
        }
        case "elevenlabs.conversation": {
          if (event.capability !== "start-voice-session") return this.unsupported(route, event);
          const payload = event.payload as { locale?: unknown };
          if (!payload || typeof payload.locale !== "string" || !CLARA_LOCALES.has(payload.locale as Locale)) {
            return this.failure(event, "ElevenLabs start-voice-session requires locale fr, en, es, de, or it.");
          }
          const data = await getElevenLabsSignedUrl(payload.locale as Locale);
          return this.success(event, data, "ElevenLabs voice session prepared successfully.");
        }
        case "microsoft.outlook": {
          if (event.capability !== "send-email") return this.unsupported(route, event);
          const data = await sendMicrosoftMessage(event.payload as SendMicrosoftMessageOptions);
          return this.success(event, data, "Microsoft Outlook executed successfully.");
        }
        case "microsoft.calendar": {
          if (event.capability !== "schedule-event") return this.unsupported(route, event);
          const data = await createMicrosoftEvent(event.payload as CreateMicrosoftEventOptions);
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
