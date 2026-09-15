/**
 * ============================================
 * CLARA OS
 * OpenAI Responses Connector
 * --------------------------------------------
 * File : openai-responses-context.ts
 * Responsibility :
 * Defines the execution context
 * for OpenAI Responses.
 * ============================================
 */

import type { FunctionTool } from "openai/resources/responses/responses";

/**
 * Re-export for convenience.
 */
export type { FunctionTool };

/**
 * OpenAI Responses context.
 */
export interface OpenAIResponsesContext {

  /**
   * User prompt.
   */
  prompt: string;

  /**
   * Optional system instructions.
   */
  instructions?: string;

  /**
   * Requested model.
   */
  model?: string;

  /**
   * Maximum output tokens.
   */
  maxTokens?: number;

  /**
   * Temperature.
   */
  temperature?: number;

  /**
   * Optional Responses-API tools available to the model.
   * Each item is a flat `FunctionTool` (not the Chat Completions wrapper).
   * When provided together with `onToolCall`, the engine runs an agentic loop.
   */
  tools?: FunctionTool[];

  /**
   * Callback invoked when the model requests a tool call.
   * Must return the tool output as a plain string.
   */
  onToolCall?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<string>;

  /**
   * Additional metadata.
   */
  metadata?: Record<string, unknown>;

}
