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

import { CapabilityEngine } from "@/lib/capabilities/capability-engine";

import { Runtime } from "./runtime";
import { RuntimeEvent } from "./runtime-event";
import { RuntimeResult } from "./runtime-result";

/**
 * Runtime Engine.
 */
export class RuntimeEngine {

  /**
   * Capability Engine.
   */
  private readonly capabilityEngine =
    new CapabilityEngine();

  /**
   * Executes one runtime cycle.
   */
  public async run(
    runtime: Runtime,
    event: RuntimeEvent,
  ): Promise<RuntimeResult> {

    const result =
      await this.capabilityEngine.execute({

        capabilityId: event.capabilityId,

        context: event.context,

      });

    return {

      success: result.success,

      message: result.message,

      outputs: result.content
        ? [result.content]
        : undefined,

      documentId: result.documentId,

      documentUrl: result.documentUrl,

      completedAt: result.completedAt,

    };

  }

}