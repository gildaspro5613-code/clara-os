/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : brevo-brain-source.ts
 * Responsibility :
 * Exposes Brevo data as a Brain context source.
 *
 * Principle:
 * - Brevo is loaded only when explicitly requested
 *   via a structured payload, not through keyword
 *   guessing on free-form text.
 * - Operations are targeted: the payload must
 *   specify what is needed (contact, campaigns…)
 *   and supply the relevant identifiers.
 * - A load failure never blocks the Brain cycle.
 * ============================================
 */

import type { Event } from "@/types";
import { BrevoEngine } from "./brevo-engine";

/**
 * Supported Brevo context requests.
 */
export interface BrevoContextRequest {

  /**
   * Load a single contact by email.
   * Fetches contact data and engagement statistics.
   */
  contactEmail?: string;

  /**
   * Load the latest email campaigns.
   * Fetches campaign list for analysis.
   */
  loadCampaigns?: boolean;

}

/**
 * Shared engine instance for Brain source operations.
 */
const engine = new BrevoEngine();

/**
 * Determines whether the current event carries
 * an explicit Brevo context request.
 *
 * Only returns true when the event payload
 * contains a structured `brevo` field with
 * at least one actionable data request.
 * No keyword scanning is performed.
 */
export function isBrevoRelevant(event: Event): boolean {

  if (!event.payload) {
    return false;
  }

  const payload = event.payload as Record<string, unknown>;
  const brevo = payload["brevo"];

  if (!brevo || typeof brevo !== "object") {
    return false;
  }

  const request = brevo as BrevoContextRequest;

  return (
    (typeof request.contactEmail === "string" &&
      request.contactEmail.trim().length > 0) ||
    request.loadCampaigns === true
  );

}

/**
 * Loads targeted Brevo context data for the Brain.
 *
 * Only executes the operations explicitly requested
 * in `event.payload.brevo`. Returns an empty object
 * when the event carries no Brevo request.
 */
export async function loadBrevoContext(
  event: Event,
): Promise<Record<string, unknown>> {

  if (!isBrevoRelevant(event)) {
    return {};
  }

  const payload = event.payload as Record<string, unknown>;
  const request = payload["brevo"] as BrevoContextRequest;

  const result: Record<string, unknown> = {};

  /*
   * Targeted contact fetch — only when an email is known.
   */
  if (typeof request.contactEmail === "string" &&
      request.contactEmail.trim().length > 0) {

    try {

      const contactResult = await engine.getContact({
        operation: "get-contact",
        email: request.contactEmail.trim(),
      });

      result["contact"] = contactResult.contact ?? null;
      result["contactLoaded"] = contactResult.success;

      if (!contactResult.success) {
        result["contactError"] = contactResult.error;
      }

    } catch {

      result["contact"] = null;
      result["contactLoaded"] = false;
      result["contactError"] =
        "Brevo contact could not be loaded.";

    }

  }

  /*
   * Campaign list — only when explicitly requested.
   */
  if (request.loadCampaigns === true) {

    try {

      const campaignsResult = await engine.listCampaigns({
        operation: "list-campaigns",
        limit: 10,
        offset: 0,
      });

      result["campaigns"] = campaignsResult.campaigns ?? [];
      result["campaignsLoaded"] = campaignsResult.success;

      if (!campaignsResult.success) {
        result["campaignsError"] = campaignsResult.error;
      }

    } catch {

      result["campaigns"] = [];
      result["campaignsLoaded"] = false;
      result["campaignsError"] =
        "Brevo campaigns could not be loaded.";

    }

  }

  return { brevo: { ...result, loadedAt: new Date().toISOString() } };

}
