/**
 * ============================================
 * CLARA OS
 * OpenAI Connector
 * --------------------------------------------
 * File : openai-connector.ts
 * Responsibility :
 * Adapts the existing OpenAI Responses engine
 * to the Clara OS Connector contract.
 * ============================================
 */

import type { Connector } from "../../core/connector";
import type { ConnectorContext } from "../../core/connector-context";
import type { ConnectorEvent } from "../../core/connector-event";
import type { ConnectorResult } from "../../core/connector-result";

import { OpenAIResponsesEngine } from "./responses/openai-responses-engine";
import type { OpenAIResponsesContext } from "./responses/openai-responses-context";

export const OPENAI_CAPABILITIES = [
  "openai.responses.generate",
] as const;

/**
 * Executable OpenAI connector.
 *
 * The existing Responses engine remains the source of truth for provider
 * behaviour. This adapter only exposes it through the standardized Clara OS
 * connector execution contract.
 */
export class OpenAIConnector implements Connector {

  public readonly id = "openai";

  public readonly name = "OpenAI";

  public readonly version = "1.0.0";

  public readonly capabilities: string[] = [...OPENAI_CAPABILITIES];

  private readonly responses = new OpenAIResponsesEngine();

  public constructor(
    public readonly context: ConnectorContext,
    public enabled = true,
  ) {}

  public async execute(event: ConnectorEvent): Promise<ConnectorResult> {
    switch (event.capability) {
      case "openai.responses.generate": {
        const result = await this.responses.generate(
          event.payload as OpenAIResponsesContext,
        );

        return {
          success: result.success,
          capability: event.capability,
          data: {
            content: result.content,
            model: result.model,
            finishReason: result.finishReason,
          },
          message: result.message,
          ...(result.success ? {} : { error: result.message }),
          completedAt: result.completedAt,
        };
      }

      default:
        throw new Error(`Unsupported OpenAI capability: ${event.capability}.`);
    }
  }
}
