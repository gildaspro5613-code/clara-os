/**
 * ============================================
 * CLARA OS
 * Native Connector Resolver
 * --------------------------------------------
 * Responsibility : Resolves provider-neutral capabilities
 * to an available native connector below Brain.
 * ============================================
 */

import type { Capability } from "./capability-router";

export const NATIVE_CONNECTOR_IDS = [
  "google.gmail",
  "google.calendar",
  "google.drive",
  "google.docs",
  "google.sheets",
  "microsoft.outlook",
  "microsoft.calendar",
  "openai.responses",
  "elevenlabs.speech",
] as const;

export type NativeConnectorId = (typeof NATIVE_CONNECTOR_IDS)[number];

export interface NativeConnectorResolutionContext {
  connectorId?: NativeConnectorId;
  preferredConnectorId?: NativeConnectorId;
  availableConnectors?: NativeConnectorId[];
  organization?: {
    preferredConnectorId?: NativeConnectorId;
    availableConnectors?: NativeConnectorId[];
  };
}

const ROUTES: Partial<Record<Capability, NativeConnectorId[]>> = {
  "generate-text": ["openai.responses"],
  "send-email": ["google.gmail", "microsoft.outlook"],
  "schedule-event": ["google.calendar", "microsoft.calendar"],
  "store-file": ["google.drive"],
  "retrieve-file": ["google.drive"],
  "create-document": ["google.docs"],
  "retrieve-document": ["google.docs"],
  "read-spreadsheet-range": ["google.sheets"],
  "write-spreadsheet-range": ["google.sheets"],
  "text-to-speech": ["elevenlabs.speech"],
  "list-voices": ["elevenlabs.speech"],
};

function asContext(context: unknown): NativeConnectorResolutionContext | undefined {
  return context && typeof context === "object"
    ? (context as NativeConnectorResolutionContext)
    : undefined;
}

export class NativeConnectorResolver {
  public resolveRoute(
    capability: Capability,
    context: unknown,
    fallbackRoute: string,
  ): string {
    const supportedRoutes = ROUTES[capability];
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
