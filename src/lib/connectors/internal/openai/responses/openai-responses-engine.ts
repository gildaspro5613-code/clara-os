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
   */
  public async generate(
    context: OpenAIResponsesContext,
  ): Promise<OpenAIResponsesResult> {

    try {
      const client = getOpenAIClient();

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