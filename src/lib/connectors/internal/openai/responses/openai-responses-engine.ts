/**
 * ============================================
 * CLARA OS
 * OpenAI Responses Connector
 * --------------------------------------------
 * File : openai-responses-engine.ts
 * Responsibility :
 * Coordinates OpenAI Responses operations.
 * ============================================
 */

import OpenAI from "openai";

import { OpenAIResponsesContext } from "./openai-responses-context";
import { OpenAIResponsesResult } from "./openai-responses-result";

/**
 * OpenAI Responses engine.
 */
export class OpenAIResponsesEngine {

  /**
   * Generates a response using OpenAI.
   */
  public async generate(
    context: OpenAIResponsesContext,
  ): Promise<OpenAIResponsesResult> {

    try {

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const input =
        context.toolOutputs && context.toolOutputs.length > 0
          ? context.toolOutputs.map(
              (toolOutput) => ({
                type: "function_call_output" as const,
                call_id: toolOutput.callId,
                output:
                  typeof toolOutput.output === "string"
                    ? toolOutput.output
                    : JSON.stringify(toolOutput.output),
              }),
            )
          : context.prompt;

      const response = await client.responses.create({

        model: context.model ?? "gpt-5.5",

        ...(context.previousResponseId
          ? {
              previous_response_id:
                context.previousResponseId,
            }
          : {}),

        input,

        instructions: context.instructions,

        max_output_tokens: context.maxTokens,

        metadata: context.metadata,

        tools: context.tools?.map(
          (tool) => ({
            type: "function" as const,
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
            strict: tool.strict ?? true,
          }),
        ),

      });

      const toolCalls =
        response.output
          .filter(
            (item) => item.type === "function_call",
          )
          .map(
            (item) => ({
              callId: item.call_id,
              name: item.name,
              arguments: item.arguments,
            }),
          );

      return {

        success: true,

        content: response.output_text,

        responseId: response.id,

        model: response.model,

        finishReason:
          toolCalls.length > 0
            ? "tool_call"
            : "completed",

        message:
          toolCalls.length > 0
            ? "Tool call requested successfully."
            : "Response generated successfully.",

        toolCalls:
          toolCalls.length > 0
            ? toolCalls
            : undefined,

        completedAt: new Date(),

      };

    } catch (error) {

      return {

        success: false,

        content: "",

        model: context.model,

        finishReason: "error",

        message:
          error instanceof Error
            ? error.message
            : "Unknown OpenAI error.",

        completedAt: new Date(),

      };

    }

  }

}
