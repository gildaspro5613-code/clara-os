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
   * Additional metadata.
   */
  metadata?: Record<string, unknown>;

}
