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
import type { CapabilityExecutionPrincipal } from "@/lib/capabilities/capability-policy";

const MAX_TOOL_ROUNDS = 5;

function toModelToolName(capabilityId: string): string {
  return capabilityId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export interface CognitiveToolLoopInput {
  readonly prompt: string;
  readonly principal?: CapabilityExecutionPrincipal;
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

    const approvalRequests: NonNullable<OpenAIResponsesResult["approvalRequests"]> = [];

    const principal = input.principal ?? {
      actorId: "system",
      workspaceId: "default",
      plan: "essential" as const,
      approvedCapabilityIds: [],
    };

    const capabilities = this.registry.getAll();
    const capabilityTools =
      toCapabilityTools(capabilities);

    const capabilityIdByToolName = new Map<string, string>();

    const tools =
      capabilityTools.map(
        (tool, index) => {
          const capabilityId = capabilities[index].id;
          const modelToolName = toModelToolName(tool.name);

          const existingCapabilityId =
            capabilityIdByToolName.get(modelToolName);

          if (
            existingCapabilityId &&
            existingCapabilityId !== capabilityId
          ) {
            throw new Error(
              `Capability tool name collision: "${existingCapabilityId}" and "${capabilityId}" both map to "${modelToolName}".`,
            );
          }

          capabilityIdByToolName.set(
            modelToolName,
            capabilityId,
          );

          return {
            type: "function" as const,
            name: modelToolName,
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
          };
        },
      );

    let result =
      await this.engine.generate({
        prompt: input.prompt,
        model: process.env.OPENAI_MODEL ?? "gpt-5.5",
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
        return { ...result, approvalRequests };
      }

      const toolOutputs = [];
      for (const toolCall of result.toolCalls as OpenAIToolCall[]) {

        const capabilityId =
          capabilityIdByToolName.get(toolCall.name) ??
          toolCall.name;

        const execution =
          await this.bridge.execute(
            {
              ...toolCall,
              name: capabilityId,
            },
            principal,
          );

        toolOutputs.push({
          callId: toolCall.callId,
          output: {
            success: execution.success,
            capabilityId:
              execution.capabilityId,
            message:
              execution.message,
            content:
              execution.content,
            code: execution.code,
          },
        });
        if (execution.approvalRequest) {
          approvalRequests.push(execution.approvalRequest);
        }
      }

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
          model: process.env.OPENAI_MODEL ?? "gpt-5.5",
          previousResponseId:
            result.responseId,
          toolOutputs,
          tools,
        });
    }

    return {
      ...result,
      approvalRequests,
      message:
        result.toolCalls && result.toolCalls.length > 0
          ? `Maximum cognitive tool rounds (${MAX_TOOL_ROUNDS}) reached.`
          : result.message,
    };
  }
}
