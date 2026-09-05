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
 * Function tool call requested by the model.
 */
export interface OpenAIToolCall {
  readonly callId: string;
  readonly name: string;
  readonly arguments: string;
}

export interface OpenAIToolApprovalRequest {
  readonly id: string;
  readonly token: string;
  readonly capabilityId: string;
  readonly summary: string;
  readonly expiresAt: string;
}

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
   * Responses API response identifier.
   *
   * Required to continue a tool-enabled reasoning cycle.
   */
  readonly responseId?: string;

  /**
   * Model used.
   */
  readonly model?: string;

  /**
   * Finish reason.
   */
  readonly finishReason?: string;

  /**
   * Function tool calls requested by the model.
   */
  readonly toolCalls?: OpenAIToolCall[];

  readonly approvalRequests?: OpenAIToolApprovalRequest[];

  /**
   * Connector providers that must be reauthenticated before the
   * interrupted request can continue. Reauthentication never grants
   * approval for a WRITE/EXECUTE capability.
   */
  readonly requiredConnections?: string[];

  /**
   * Execution message.
   */
  readonly message: string;

  /**
   * Execution date.
   */
  readonly completedAt: Date;

}
