/**
 * ============================================
 * CLARA OS
 * Capability Router
 * --------------------------------------------
 * Responsibility : Resolves provider-neutral capabilities
 * below Brain without exposing provider details upstream.
 * ============================================
 */

import { NativeConnectorResolver } from "./native-connector-resolver";

export type Capability =
  | "generate-text"
  | "generate-document"
  | "publish-document"
  | "send-email"
  | "schedule-event"
  | "store-file"
  | "retrieve-file"
  | "create-document"
  | "retrieve-document"
  | "read-spreadsheet-range"
  | "write-spreadsheet-range"
  | "speech-to-text"
  | "text-to-speech"
  | "list-voices"
  | "unknown";

const CANONICAL_ROUTES: Partial<Record<Capability, string>> = {
  "generate-text": "openai.responses",
  "generate-document": "publisher",
  "publish-document": "publisher",
  "send-email": "google.gmail",
  "schedule-event": "google.calendar",
  "store-file": "google.drive",
  "retrieve-file": "google.drive",
  "create-document": "google.docs",
  "retrieve-document": "google.docs",
  "read-spreadsheet-range": "google.sheets",
  "write-spreadsheet-range": "google.sheets",
  "speech-to-text": "openai.audio",
  "text-to-speech": "elevenlabs.speech",
  "list-voices": "elevenlabs.speech",
};

/**
 * Capability Router.
 *
 * Brain asks for a capability only. Provider choice remains below Brain and
 * may use an explicit/available connector context when present.
 */
export class CapabilityRouter {
  private readonly nativeResolver = new NativeConnectorResolver();

  public resolve(
    capability: Capability,
    context?: unknown,
  ): string {
    const fallbackRoute = CANONICAL_ROUTES[capability] ?? "unknown";

    if (fallbackRoute === "publisher" || fallbackRoute === "openai.audio") {
      return fallbackRoute;
    }

    return this.nativeResolver.resolveRoute(
      capability,
      context,
      fallbackRoute,
    );
  }
}
