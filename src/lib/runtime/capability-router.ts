/**
 * ============================================
 * CLARA OS
 * Capability Router
 * --------------------------------------------
 * Resolves provider-neutral capabilities below Brain.
 * ============================================
 */

import {
  isKnownCapabilityId,
  resolveCapabilityRoute,
  type CapabilityId,
} from "@/lib/capabilities/capability-catalog";
import { resolveOrganizationId } from "@/lib/core/organization-context";

import {
  NativeConnectorResolver,
  type NativeConnectorId,
} from "./native-connector-resolver";
import { OrganizationConnectorRepository } from "./organization-connector-repository";

export type Capability = CapabilityId | "unknown";

function asNativeConnectorId(value: unknown): NativeConnectorId | undefined {
  return typeof value === "string" ? value as NativeConnectorId : undefined;
}

/**
 * Brain requests only a provider-neutral capability id.
 *
 * With organization identity, the durable connector registry is authoritative:
 * only enabled connectors may be selected and there is no canonical-provider
 * fallback. Legacy flows without organization identity retain canonical routing.
 */
export class CapabilityRouter {
  private readonly nativeConnectorResolver = new NativeConnectorResolver();
  private readonly connectorRepository = new OrganizationConnectorRepository();

  public async resolve(capability: Capability, context?: unknown): Promise<string> {
    if (!isKnownCapabilityId(capability)) return "unknown";

    const canonicalRoute = resolveCapabilityRoute(capability);
    const organizationId = resolveOrganizationId(context);

    if (!organizationId) {
      return this.nativeConnectorResolver.resolveRoute(capability, context, canonicalRoute);
    }

    const enabled = await this.connectorRepository.listEnabled(organizationId);
    const availableConnectors = enabled.map((record) => record.connectorId);
    if (!availableConnectors.length) return "unknown";

    const baseContext =
      context && typeof context === "object" ? context as Record<string, unknown> : {};

    const requested = asNativeConnectorId(baseContext.connectorId);
    const preferred = asNativeConnectorId(baseContext.preferredConnectorId);
    const allowedRequested = requested && availableConnectors.includes(requested) ? requested : undefined;
    const allowedPreferred = preferred && availableConnectors.includes(preferred) ? preferred : undefined;

    return this.nativeConnectorResolver.resolveRoute(
      capability,
      {
        connectorId: allowedRequested,
        preferredConnectorId: allowedPreferred,
        availableConnectors,
      },
      "unknown",
    );
  }
}
