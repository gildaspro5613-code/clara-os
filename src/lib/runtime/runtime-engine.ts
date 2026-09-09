/**
 * ============================================
 * CLARA OS
 * Runtime Engine
 * --------------------------------------------
 * File : runtime-engine.ts
 * Responsibility :
 * Coordinates one complete Clara
 * runtime execution.
 * ============================================
 */

import { isKnownCapabilityId } from "@/lib/capabilities/capability-catalog";
import { CapabilityEngine } from "@/lib/capabilities/capability-engine";
import { CapabilityRegistry } from "@/lib/capabilities/capability-registry";
import { ConnectorEngine } from "@/lib/connectors/core/connector-engine";

import { CapabilityRouter } from "./capability-router";
import { Runtime } from "./runtime";
import { RuntimeEvent } from "./runtime-event";
import { RuntimeResult } from "./runtime-result";

/**
 * Runtime Engine.
 *
 * Provider-neutral capability ids enter Runtime. Implemented Clara workflows
 * stay inside CapabilityEngine; connector-backed capabilities are routed below
 * Brain to the organization-configured provider when available.
 */
export class RuntimeEngine {
  private readonly capabilityEngine = new CapabilityEngine();
  private readonly capabilityRegistry = new CapabilityRegistry();
  private readonly capabilityRouter = new CapabilityRouter();
  private readonly connectorEngine = new ConnectorEngine();

  /**
   * Executes one runtime cycle.
   */
  public async run(
    runtime: Runtime,
    event: RuntimeEvent,
  ): Promise<RuntimeResult> {
    void runtime;

    if (this.capabilityRegistry.has(event.capabilityId)) {
      const result = await this.capabilityEngine.execute({
        capabilityId: event.capabilityId,
        context: event.context,
      });

      return {
        success: result.success,
        message: result.message,
        completedAt: result.completedAt,
      };
    }

    if (!isKnownCapabilityId(event.capabilityId)) {
      return {
        success: false,
        message: `Unknown capability: ${event.capabilityId}`,
        completedAt: new Date(),
      };
    }

    const route = this.capabilityRouter.resolve(
      event.capabilityId,
      event.context,
    );

    if (route === "unknown") {
      return {
        success: false,
        message: `No route for capability: ${event.capabilityId}`,
        completedAt: new Date(),
      };
    }

    const result = await this.connectorEngine.executeRoute(route, {
      id: event.id,
      capability: event.capabilityId,
      payload: event.context,
      source: event.source,
      receivedAt: event.receivedAt,
    });

    return {
      success: result.success,
      message: result.error ?? result.message ?? "Connector execution completed.",
      completedAt: result.completedAt,
    };
  }
}
