/**
 * ============================================
 * CLARA OS
 * Capability Tool Bridge
 * --------------------------------------------
 * Converts model tool calls into capability
 * execution requests.
 *
 * Responsibility:
 * - validate the requested capability
 * - parse tool arguments
 * - delegate execution
 *
 * This layer does not decide which capability
 * should be used.
 * ============================================
 */

import {
  CapabilityEngine,
} from "./capability-engine";

import {
  CapabilityRegistry,
} from "./capability-registry";

import type {
  OpenAIToolCall,
} from "@/lib/connectors/internal/openai/responses/openai-responses-result";

export interface CapabilityToolBridgeResult {
  readonly success: boolean;
  readonly callId: string;
  readonly capabilityId: string;
  readonly message: string;
  readonly content?: string;
  readonly completedAt: Date;
}

export class CapabilityToolBridge {

  private readonly registry =
    new CapabilityRegistry();

  private readonly engine =
    new CapabilityEngine();

  /**
   * Executes one model-requested capability.
   */
  public async execute(
    toolCall: OpenAIToolCall,
  ): Promise<CapabilityToolBridgeResult> {

    const capabilityId =
      toolCall.name.trim();

    if (!capabilityId) {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message: "Tool call capability name is required.",
        completedAt: new Date(),
      };
    }

    if (!this.registry.has(capabilityId)) {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message:
          `Unknown Clara capability: "${capabilityId}".`,
        completedAt: new Date(),
      };
    }

    let context: unknown;

    try {
      context =
        JSON.parse(toolCall.arguments);
    } catch {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message:
          "Tool call arguments are not valid JSON.",
        completedAt: new Date(),
      };
    }

    if (
      context === null ||
      typeof context !== "object" ||
      Array.isArray(context)
    ) {
      return {
        success: false,
        callId: toolCall.callId,
        capabilityId,
        message:
          "Tool call context must be a JSON object.",
        completedAt: new Date(),
      };
    }

    const result =
      await this.engine.execute({
        capabilityId,
        context,
      });

    return {
      success: result.success,
      callId: toolCall.callId,
      capabilityId,
      message: result.message,
      content: result.content,
      completedAt: result.completedAt,
    };
  }
}
