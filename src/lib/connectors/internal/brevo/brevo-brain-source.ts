/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : brevo-brain-source.ts
 * Responsibility :
 * Exposes Brevo data as a Brain context source.
 * Loaded only when the current event is
 * Brevo-relevant.
 * ============================================
 */

import type { Event } from "@/types";
import { BrevoEngine } from "./brevo-engine";

/**
 * Brevo-related keywords used for relevance detection.
 */
const BREVO_KEYWORDS =
  /brevo|contact|prospect|client|campagne|campaign|email|relance|follow.?up|mailing/i;

/**
 * Shared engine instance for Brain source operations.
 */
const engine = new BrevoEngine();

/**
 * Determines whether the current event requires
 * Brevo context to be loaded into the Brain.
 */
export function isBrevoRelevant(event: Event): boolean {

  if (!event.payload) {
    return false;
  }

  const payload = event.payload as Record<string, unknown>;

  /*
   * Explicit flag: the caller can set payload.brevo = true
   * to force loading.
   */
  if (payload["brevo"] === true) {
    return true;
  }

  /*
   * Intent-based detection: check the intent or
   * message field of the payload for Brevo keywords.
   */
  const intent =
    typeof payload["intent"] === "string"
      ? payload["intent"]
      : "";

  const message =
    typeof payload["message"] === "string"
      ? payload["message"]
      : "";

  return (
    BREVO_KEYWORDS.test(intent) ||
    BREVO_KEYWORDS.test(message)
  );

}

/**
 * Loads Brevo context data for the Brain.
 *
 * Returns a metadata record to be merged into
 * the Brain's context.metadata. Returns an empty
 * object when Brevo is not relevant to the event.
 */
export async function loadBrevoContext(
  event: Event,
): Promise<Record<string, unknown>> {

  if (!isBrevoRelevant(event)) {
    return {};
  }

  try {

    const contactsResult = await engine.listContacts({
      operation: "list-contacts",
      limit: 20,
      offset: 0,
    });

    return {
      brevo: {
        contacts: contactsResult.contacts ?? [],
        contactsLoaded: contactsResult.success,
        loadedAt: new Date().toISOString(),
      },
    };

  } catch {

    /*
     * A Brevo load failure must never block
     * the Brain reasoning cycle.
     */
    return {
      brevo: {
        contacts: [],
        contactsLoaded: false,
        loadedAt: new Date().toISOString(),
        error: "Brevo context could not be loaded.",
      },
    };

  }

}
