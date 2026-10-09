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

  /** Allowlisted technical diagnostics only; never provider messages/content. */
  readonly failureCategory?: "provider_auth" | "provider_rate_limit" | "provider_timeout" | "provider_connection" | "provider_server" | "provider_request" | "provider_unknown";
  readonly providerHttpStatus?: number;
  readonly responseStatus?: "completed" | "incomplete" | "failed" | "other";
  readonly incompleteReason?: "max_output_tokens" | "content_filter" | "other";
  readonly outputTokens?: number;

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
   * Execution message.
   */
  readonly message: string;

  /**
   * Execution date.
   */
  readonly completedAt: Date;

}
