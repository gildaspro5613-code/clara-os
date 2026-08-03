/**
 * ============================================
 * CLARA OS
 * Capability Engine
 * --------------------------------------------
 * File : capability-engine.ts
 * Responsibility :
 * Executes a capability through
 * its declared workflow.
 * ============================================
 */

import { CapabilityRegistry } from "./capability-registry";

import { GenerateDocumentContext } from "./generate-document/context";
import { GenerateDocumentWorkflow } from "./generate-document/workflow";

/**
 * Capability execution request.
 */
export interface CapabilityExecutionRequest {

  /**
   * Capability identifier.
   */
  readonly capabilityId: string;

  /**
   * Capability execution context.
   */
  readonly context: unknown;

}

/**
 * Capability execution result.
 */
export interface CapabilityExecutionResult {

  /**
   * Execution status.
   */
  readonly success: boolean;

  /**
   * Execution message.
   */
  readonly message: string;

  /**
   * Optional generated content.
   */
  readonly content?: string;

  /**
   * Completion timestamp.
   */
  readonly completedAt: Date;

}

/**
 * Capability Engine.
 */
export class CapabilityEngine {

  /**
   * Capability registry.
   */
  private readonly registry =
    new CapabilityRegistry();

  /**
   * Generate Document workflow.
   */
  private readonly generateDocumentWorkflow =
    new GenerateDocumentWorkflow();

  /**
   * Executes one capability.
   */
  public async execute(
    request: CapabilityExecutionRequest,
  ): Promise<CapabilityExecutionResult> {

    const capability =
      this.registry.findById(request.capabilityId);

    if (!capability) {

      return {

        success: false,

        message: `Unknown capability: ${request.capabilityId}`,

        completedAt: new Date(),

      };

    }

    /**
     * Temporary implementation.
     * The registry will later expose the
     * workflow directly.
     */
    if (request.capabilityId === "generate-document") {

      const result =
        await this.generateDocumentWorkflow.execute(

          request.context as GenerateDocumentContext,

        );

      return {

        success: result.success,

        message: result.message,

        content: result.content,

        completedAt: result.completedAt,

      };

    }

    return {

      success: false,

      message: "Capability not implemented.",

      completedAt: new Date(),

    };

  }

}