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
   * Previous Responses API response identifier.
   *
   * Used when continuing a tool-enabled reasoning cycle.
   */
  previousResponseId?: string;

  /**
   * Outputs produced by Clara after executing
   * model-requested function calls.
   */
  toolOutputs?: Array<{
    readonly callId: string;
    readonly output: unknown;
  }>;

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
   * Generic tools exposed to the model.
   */
  tools?: Array<{
    type: "function";
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
  }>;

  /**
   * Additional metadata.
   */
  metadata?: Record<string, string>;

}
