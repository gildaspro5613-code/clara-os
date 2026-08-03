/**
 * ============================================
 * CLARA OS
 * OpenAI Responses Connector
 * --------------------------------------------
 * File : openai-responses-result.ts
 * Responsibility :
 * Defines the result returned
 * by OpenAI Responses.
 * ============================================
 */

/**
 * OpenAI Responses result.
 */
export interface OpenAIResponsesResult {

  /**
   * Operation status.
   */
  success: boolean;

  /**
   * Generated content.
   */
  content: string;

  /**
   * Model used.
   */
  model?: string;

  /**
   * Optional finish reason.
   */
  finishReason?: string;

  /**
   * Optional message.
   */
  message?: string;

  /**
   * Execution date.
   */
  completedAt: Date;

}