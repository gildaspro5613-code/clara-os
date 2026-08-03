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
  readonly success: boolean;

  /**
   * Generated content.
   */
  readonly content: string;

  /**
   * Model used.
   */
  readonly model?: string;

  /**
   * Finish reason.
   */
  readonly finishReason?: string;

  /**
   * Execution message.
   */
  readonly message: string;

  /**
   * Execution date.
   */
  readonly completedAt: Date;

}