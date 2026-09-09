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

import { NativeConnectorResolver } from "./native-connector-resolver";

export type Capability = CapabilityId | "unknown";

/**
 * Capability Router.
 *
 * Brain requests only a provider-neutral capability id. Native connector
 * selection remains below Brain and may use explicit/available organization
 * connector context. The canonical route remains the backward-compatible
 * fallback while durable connection settings are introduced.
 */
export class CapabilityRouter {
  private readonly nativeConnectorResolver = new NativeConnectorResolver();

  public resolve(capability: Capability, context?: unknown): string {
    if (!isKnownCapabilityId(capability)) {
      return "unknown";
    }

    const canonicalRoute = resolveCapabilityRoute(capability);

    return this.nativeConnectorResolver.resolveRoute(
      capability,
      context,
      canonicalRoute,
    );
  }
}
