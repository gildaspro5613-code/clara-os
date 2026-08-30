/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * Cognitive Tool Loop
 * --------------------------------------------
 * Coordinates model reasoning with Clara's
 * executable capabilities.
 *
 * Responsibility:
 * - expose registered capabilities to the model
 * - execute requested tool calls
 * - return real execution results to the model
 * - continue reasoning until a final response
 * - protect the cycle with a maximum round count
 * ============================================
 */

import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import type {
  OpenAIResponsesResult,
  OpenAIToolCall,
} from "@/lib/connectors/internal/openai/responses/openai-responses-result";

import { CapabilityToolBridge } from "@/lib/capabilities/capability-tool-bridge";
import { CapabilityRegistry } from "@/lib/capabilities/capability-registry";
import { toCapabilityTools } from "@/lib/capabilities/capability-tool-adapter";

const MAX_TOOL_ROUNDS = 5;

export interface CognitiveToolLoopInput {
  readonly prompt: string;
}

export class CognitiveToolLoop {

  private readonly engine =
    new OpenAIResponsesEngine();

  private readonly bridge =
    new CapabilityToolBridge();

  private readonly registry =
    new CapabilityRegistry();

  /**
   * Runs one bounded cognitive tool cycle.
   */
  public async execute(
    input: CognitiveToolLoopInput,
  ): Promise<OpenAIResponsesResult> {

    const capabilities =
      this.registry.getAvailableCapabilities();

    const capabilityTools =
      toCapabilityTools(
        this.registry.getAll(),
      );

    const tools =
      capabilityTools.map(
        (tool) => ({
          type: "function" as const,
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: Object.fromEntries(
              Object.entries(
                tool.parameters,
              ).map(
                ([name, parameter]) => [
                  name,
                  {
                    type: parameter.type,
                    description:
                      parameter.description,
                  },
                ],
              ),
            ),
            required: Object.entries(
              tool.parameters,
            )
              .filter(
                ([, parameter]) =>
                  parameter.required,
              )
              .map(([name]) => name),
            additionalProperties: false,
          },
          strict: true,
        }),
      );

    let result =
      await this.engine.generate({
        prompt: input.prompt,
        model: "gpt-5.5",
        tools,
      });

    for (
      let round = 0;
      round < MAX_TOOL_ROUNDS;
      round += 1
    ) {

      if (
        !result.success ||
        !result.toolCalls ||
        result.toolCalls.length === 0
      ) {
        return result;
      }

      const toolOutputs =
        await Promise.all(
          result.toolCalls.map(
            async (toolCall: OpenAIToolCall) => {

              const execution =
                await this.bridge.execute(
                  toolCall,
                );

              return {
                callId: toolCall.callId,
                output: {
                  success: execution.success,
                  capabilityId:
                    execution.capabilityId,
                  message:
                    execution.message,
                  content:
                    execution.content,
                },
              };
            },
          ),
        );

      if (!result.responseId) {
        return {
          ...result,
          success: false,
          message:
            "Tool calls were returned without a Responses API response identifier.",
        };
      }

      result =
        await this.engine.generate({
          prompt: "",
          model: "gpt-5.5",
          previousResponseId:
            result.responseId,
          toolOutputs,
          tools,
        });
    }

    return {
      ...result,
      message:
        result.toolCalls && result.toolCalls.length > 0
          ? `Maximum cognitive tool rounds (${MAX_TOOL_ROUNDS}) reached.`
          : result.message,
    };
  }
}
