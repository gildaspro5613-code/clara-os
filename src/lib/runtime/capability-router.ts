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
import { resolveOrganizationId } from "@/lib/core/organization-context";

import { NativeConnectorResolver } from "./native-connector-resolver";
import { OrganizationConnectorRepository } from "./organization-connector-repository";

export type Capability = CapabilityId | "unknown";

/**
 * Capability Router.
 *
 * Brain requests only a provider-neutral capability id. When an organization
 * identity is present, its durable enabled connector registry becomes the
 * authoritative availability context. Explicit connector preference may still
 * be supplied by trusted Runtime context. Canonical routes remain the fallback
 * for legacy flows that do not yet carry an organization identity.
 */
export class CapabilityRouter {
  private readonly nativeConnectorResolver = new NativeConnectorResolver();
  private readonly connectorRepository = new OrganizationConnectorRepository();

  public async resolve(capability: Capability, context?: unknown): Promise<string> {
    if (!isKnownCapabilityId(capability)) {
      return "unknown";
    }

    const canonicalRoute = resolveCapabilityRoute(capability);
    const organizationId = resolveOrganizationId(context);

    if (!organizationId) {
      return this.nativeConnectorResolver.resolveRoute(
        capability,
        context,
        canonicalRoute,
      );
    }

    const enabled = await this.connectorRepository.listEnabled(organizationId);
    const availableConnectors = enabled.map((record) => record.connectorId);

    const baseContext =
      context && typeof context === "object"
        ? (context as Record<string, unknown>)
        : {};

    return this.nativeConnectorResolver.resolveRoute(
      capability,
      { ...baseContext, availableConnectors },
      canonicalRoute,
    );
  }
}
