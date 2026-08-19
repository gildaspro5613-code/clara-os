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

      const response = await client.responses.create({

        model: context.model ?? "gpt-5.5",

        input: context.prompt,

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