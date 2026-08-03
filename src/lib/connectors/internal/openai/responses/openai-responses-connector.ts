/**
 * ============================================
 * CLARA OS
 * OpenAI Responses Connector
 * --------------------------------------------
 * File : openai-responses-connector.ts
 * Responsibility :
 * Defines the OpenAI Responses
 * connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import { OpenAIResponsesContext } from "./openai-responses-context";
import { OpenAIResponsesResult } from "./openai-responses-result";

/**
 * OpenAI Responses connector.
 */
export interface OpenAIResponsesConnector extends Connector {

  /**
   * Connects to OpenAI.
   */
  connect(): Promise<void>;

  /**
   * Generates a response.
   */
  generate(
    context: OpenAIResponsesContext,
  ): Promise<OpenAIResponsesResult>;

}