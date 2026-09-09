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

import { ProviderResolver } from "./provider-resolver";

export type Capability = CapabilityId | "unknown";

/**
 * Capability Router.
 *
 * Brain only requests a provider-neutral capability id. Routing remains
 * below Brain. Organization configuration may select a workspace provider;
 * otherwise the canonical catalog route remains the backward-compatible
 * fallback.
 */
export class CapabilityRouter {
  private readonly providerResolver = new ProviderResolver();

  public resolve(capability: Capability, context?: unknown): string {
    if (!isKnownCapabilityId(capability)) {
      return "unknown";
    }

    const canonicalRoute = resolveCapabilityRoute(capability);

    return this.providerResolver.resolveRoute(
      capability,
      context,
      canonicalRoute,
    );
  }
}
