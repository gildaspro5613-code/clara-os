/**
 * ============================================
 * CLARA OS
 * OpenAI Responses Connector
 * --------------------------------------------
 * File : openai-responses-engine.ts
 * Responsibility :
 * Coordinates OpenAI Responses operations.
 * Supports optional tool calling (agentic loop)
 * with a bounded iteration limit.
 * ============================================
 */

import OpenAI from "openai";
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
} from "openai/resources/responses/responses";

import { OpenAIResponsesContext } from "./openai-responses-context";
import { OpenAIResponsesResult } from "./openai-responses-result";

/** Maximum number of agentic loop iterations before forcing a stop. */
const MAX_TOOL_ITERATIONS = 5;

/**
 * Returns the OpenAI client when the API key is configured.
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

/**
 * OpenAI Responses engine.
 */
export class OpenAIResponsesEngine {

  /**
   * Generates a response using OpenAI.
   *
   * When `context.tools` and `context.onToolCall` are provided, the engine
   * runs an agentic loop: it calls the model, executes any requested tool
   * calls, feeds the results back, and repeats until the model produces a
   * final text response or the iteration limit is reached.
   */
  public async generate(
    context: OpenAIResponsesContext,
  ): Promise<OpenAIResponsesResult> {

    try {
      const client = getOpenAIClient();

      if (context.tools && context.tools.length > 0 && context.onToolCall) {
        return await this.generateWithTools(client, context);
      }

      return await this.generateSimple(client, context);

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

  /**
   * Simple generation without tool calling.
   */
  private async generateSimple(
    client: OpenAI,
    context: OpenAIResponsesContext,
  ): Promise<OpenAIResponsesResult> {

    const response = await client.responses.create({

      model: context.model ?? "gpt-5.5",

      input: context.prompt,

      ...(context.instructions ? { instructions: context.instructions } : {}),

    });

    return {

      success: true,

      content: response.output_text,

      model: response.model,

      finishReason: "completed",

      message: "Response generated successfully.",

      completedAt: new Date(),

    };

  }

  /**
   * Agentic loop generation with tool calling.
   *
   * Bounded by MAX_TOOL_ITERATIONS to prevent infinite loops.
   */
  private async generateWithTools(
    client: OpenAI,
    context: OpenAIResponsesContext,
  ): Promise<OpenAIResponsesResult> {

    // Start with the user message as the initial input.
    let input: ResponseInputItem[] = [
      {
        role: "user",
        content: context.prompt,
      } as ResponseInputItem,
    ];

    let iteration = 0;

    while (iteration < MAX_TOOL_ITERATIONS) {

      iteration++;

      const response = await client.responses.create({
        model: context.model ?? "gpt-5.5",
        input,
        tools: context.tools,
        ...(context.instructions
          ? { instructions: context.instructions }
          : {}),
      });

      const output = response.output;

      // Collect tool call items from the output.
      const toolCalls = output.filter(
        (item): item is ResponseFunctionToolCall =>
          item.type === "function_call",
      );

      if (toolCalls.length === 0) {
        // No tool calls — the model produced a final text response.
        return {
          success: true,
          content: response.output_text,
          model: response.model,
          finishReason: "completed",
          message: "Response generated successfully.",
          completedAt: new Date(),
        };
      }

      // Build tool result items.
      const toolResults: ResponseInputItem[] = [];

      for (const toolCall of toolCalls) {

        let toolOutput: string;

        try {
          const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;
          toolOutput = await context.onToolCall!(toolCall.name, args);
        } catch (err) {
          toolOutput = JSON.stringify({
            error: err instanceof Error ? err.message : "Tool execution failed.",
          });
        }

        toolResults.push({
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: toolOutput,
        } as ResponseInputItem);

      }

      // The next input is all previous output items cast as inputs,
      // followed by the tool results.
      input = [
        ...output as unknown as ResponseInputItem[],
        ...toolResults,
      ];

    }

    // Iteration limit reached.
    return {
      success: false,
      content: "",
      model: context.model,
      finishReason: "error",
      message: `Tool calling iteration limit (${MAX_TOOL_ITERATIONS}) reached without a final response.`,
      completedAt: new Date(),
    };

  }

}