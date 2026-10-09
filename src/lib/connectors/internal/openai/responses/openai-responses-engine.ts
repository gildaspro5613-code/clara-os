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
const DEFAULT_MAX_OUTPUT_TOKENS = 1_200;
const HARD_MAX_OUTPUT_TOKENS = 2_000;

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

        max_output_tokens: Math.min(
          context.maxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          context.outputProfile === "document_analysis" ? 6_000 : HARD_MAX_OUTPUT_TOKENS,
        ),

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

        responseStatus: response.status === "completed" || response.status === "incomplete" || response.status === "failed" ? response.status : "other",
        incompleteReason: response.incomplete_details ? (response.incomplete_details.reason === "max_output_tokens" || response.incomplete_details.reason === "content_filter" ? response.incomplete_details.reason : "other") : undefined,
        outputTokens: response.usage?.output_tokens,

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

        failureCategory: error instanceof OpenAI.APIConnectionTimeoutError ? "provider_timeout"
          : error instanceof OpenAI.APIConnectionError ? "provider_connection"
          : error instanceof OpenAI.APIError ? (error.status === 401 || error.status === 403 ? "provider_auth"
            : error.status === 429 ? "provider_rate_limit" : error.status && error.status >= 500 ? "provider_server" : "provider_request")
          : "provider_unknown",
        providerHttpStatus: error instanceof OpenAI.APIError && Number.isInteger(error.status) && error.status! >= 400 && error.status! <= 599 ? error.status : undefined,

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
