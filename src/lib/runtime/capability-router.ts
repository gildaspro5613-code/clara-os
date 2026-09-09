/**
 * ============================================
 * CLARA OS
 * Capability Router
 * --------------------------------------------
 * File : capability-router.ts
 * Responsibility :
 * Resolves a capability into the lower-level
 * connector/service responsible for it.
 * ============================================
 */

import {
  isKnownCapabilityId,
  resolveCapabilityRoute,
  type CapabilityId,
} from "@/lib/capabilities/capability-catalog";

export type Capability = CapabilityId | "unknown";

/**
 * Capability Router.
 *
 * Brain only requests a provider-neutral capability id. Routing remains
 * below Brain and is sourced from the canonical capability catalog.
 */
export class CapabilityRouter {
  public resolve(capability: Capability): string {
    if (!isKnownCapabilityId(capability)) {
      return "unknown";
    }

    return resolveCapabilityRoute(capability);
  }
}
