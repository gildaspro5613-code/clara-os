/**
 * ============================================
 * CLARA OS
 * Capability Catalog
 * --------------------------------------------
 * Responsibility :
 * Canonical provider-neutral list of capabilities
 * known by Clara OS and their lower-level route.
 * ============================================
 */

export const CAPABILITY_CATALOG = {
  "generate-text": { route: "openai.responses" },
  "generate-document": { route: "publisher" },
  "publish-document": { route: "publisher" },
  "send-email": { route: "google.gmail" },
  "schedule-event": { route: "google.calendar" },
  "store-file": { route: "google.drive" },
  "retrieve-file": { route: "google.drive" },
  "speech-to-text": { route: "openai.audio" },
  "text-to-speech": { route: "openai.audio" },
  "workspace-install": { route: "workspace.installer" },
} as const;

export type CapabilityId = keyof typeof CAPABILITY_CATALOG;

export function isKnownCapabilityId(value: unknown): value is CapabilityId {
  return typeof value === "string" && value in CAPABILITY_CATALOG;
}

export function resolveCapabilityRoute(
  capabilityId: CapabilityId,
): string {
  return CAPABILITY_CATALOG[capabilityId].route;
}
