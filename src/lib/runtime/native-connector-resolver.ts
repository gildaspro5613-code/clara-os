/**
 * ============================================
 * CLARA OS
 * Native Connector Resolver
 * --------------------------------------------
 * Responsibility :
 * Resolves provider-neutral capabilities to an
 * available native connector below Brain.
 * ============================================
 */

import type { CapabilityId } from "@/lib/capabilities/capability-catalog";

export type NativeConnectorId =
  | "google.gmail"
  | "google.calendar"
  | "google.drive"
  | "google.docs"
  | "google.sheets"
  | "microsoft.outlook"
  | "microsoft.calendar"
  | "openai.responses"
  | "openai.audio"
  | "elevenlabs.conversation";

export interface NativeConnectorResolutionContext {
  connectorId?: NativeConnectorId;
  preferredConnectorId?: NativeConnectorId;
  availableConnectors?: NativeConnectorId[];
  organization?: {
    preferredConnectorId?: NativeConnectorId;
    availableConnectors?: NativeConnectorId[];
  };
}

const NATIVE_CONNECTOR_ROUTES: Partial<Record<CapabilityId, NativeConnectorId[]>> = {
  "generate-text": ["openai.responses"],
  "send-email": ["google.gmail", "microsoft.outlook"],
  "schedule-event": ["google.calendar", "microsoft.calendar"],
  "store-file": ["google.drive"],
  "retrieve-file": ["google.drive"],
  "create-document": ["google.docs"],
  "retrieve-document": ["google.docs"],
  "read-spreadsheet-range": ["google.sheets"],
  "write-spreadsheet-range": ["google.sheets"],
  "speech-to-text": ["openai.audio"],
  "text-to-speech": ["openai.audio"],
  "start-voice-session": ["elevenlabs.conversation"],
};

function asContext(context: unknown): NativeConnectorResolutionContext | undefined {
  return context && typeof context === "object"
    ? (context as NativeConnectorResolutionContext)
    : undefined;
}

export class NativeConnectorResolver {
  public resolveRoute(
    capability: CapabilityId,
    context: unknown,
    fallbackRoute: string,
  ): string {
    const supportedRoutes = NATIVE_CONNECTOR_ROUTES[capability];
    if (!supportedRoutes?.length) return fallbackRoute;

    const value = asContext(context);
    if (!value) return fallbackRoute;

    const preferred =
      value.connectorId ??
      value.preferredConnectorId ??
      value.organization?.preferredConnectorId;

    if (preferred && supportedRoutes.includes(preferred)) {
      return preferred;
    }

    const available =
      value.availableConnectors ?? value.organization?.availableConnectors;

    if (Array.isArray(available)) {
      const match = supportedRoutes.find((route) => available.includes(route));
      if (match) return match;
    }

    return fallbackRoute;
  }
}
