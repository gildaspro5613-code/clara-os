/**
 * ============================================
 * CLARA OS
 * Runtime Engine
 * --------------------------------------------
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

        capabilityId: "generate-document",

        context: {

          title: "Commercial Proposal",

          objective: "Present Clara OS",

          audience: "Festival",

          language: "French",

          tone: "Professional",

        },

      });

    return {

      success: result.success,

      message: result.message,

      completedAt: result.completedAt,

    };

  }

}