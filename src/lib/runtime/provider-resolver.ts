/**
 * ============================================
 * CLARA OS
 * Provider Resolver
 * --------------------------------------------
 * Responsibility :
 * Resolves provider-neutral capabilities to an
 * organization-configured connector provider.
 * ============================================
 */

import type { CapabilityId } from "@/lib/capabilities/capability-catalog";

export type WorkspaceProvider = "google" | "microsoft";

export interface ProviderResolutionContext {
  provider?: WorkspaceProvider;
  workspaceProvider?: WorkspaceProvider;
  organization?: {
    provider?: WorkspaceProvider;
    workspaceProvider?: WorkspaceProvider;
  };
}

const PROVIDER_ROUTES: Partial<
  Record<CapabilityId, Partial<Record<WorkspaceProvider, string>>>
> = {
  "send-email": {
    google: "google.gmail",
    microsoft: "microsoft.outlook",
  },
  "schedule-event": {
    google: "google.calendar",
    microsoft: "microsoft.calendar",
  },
};

export class ProviderResolver {
  public resolveProvider(context: unknown): WorkspaceProvider | undefined {
    if (!context || typeof context !== "object") {
      return undefined;
    }

    const value = context as ProviderResolutionContext;
    const provider =
      value.organization?.workspaceProvider ??
      value.organization?.provider ??
      value.workspaceProvider ??
      value.provider;

    return provider === "google" || provider === "microsoft"
      ? provider
      : undefined;
  }

  public resolveRoute(
    capability: CapabilityId,
    context: unknown,
    fallbackRoute: string,
  ): string {
    const routes = PROVIDER_ROUTES[capability];
    if (!routes) {
      return fallbackRoute;
    }

    const provider = this.resolveProvider(context);
    if (!provider) {
      return fallbackRoute;
    }

    return routes[provider] ?? fallbackRoute;
  }
}
