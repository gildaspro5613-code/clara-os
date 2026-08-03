/**
 * ============================================
 * CLARA OS
 * Runtime Engine
 * --------------------------------------------
 * File : runtime-engine.ts
 * Responsibility :
 * Coordinates one complete Clara
 * execution cycle.
 * ============================================
 */

import { Capability, CapabilityRouter } from "./capability-router";
import { Runtime } from "./runtime";
import { RuntimeEvent } from "./runtime-event";
import { RuntimeResult } from "./runtime-result";

/**
 * Runtime engine.
 */
export class RuntimeEngine {

  /**
   * Capability Router.
   */
  private readonly router = new CapabilityRouter();

  /**
   * Executes one complete runtime cycle.
   */
  public async run(
    runtime: Runtime,
    event: RuntimeEvent,
  ): Promise<RuntimeResult> {

    // Future RuntimeEvent will expose capability.
    // Until then we use generate-text.
    const capability: Capability = "generate-text";

    const provider = this.router.resolve(capability);

    return {

      success: true,

      message: `Runtime executed using provider: ${provider}`,

      completedAt: new Date(),

    };

  }

}