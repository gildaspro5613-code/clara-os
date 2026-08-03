/**
 * ============================================
 * CLARA OS
 * OpenAI Responses Connector
 * --------------------------------------------
 * File : module.ts
 * Responsibility :
 * Defines the OpenAI Responses
 * connector module.
 * ============================================
 */

import { OpenAIResponsesEngine } from "./openai-responses-engine";

/**
 * OpenAI Responses connector module.
 */
export const OPENAI_RESPONSES_MODULE = {

  id: "openai-responses",

  name: "OpenAI Responses",

  version: "1.0.0",

  description:
    "Provides access to OpenAI Responses through Clara OS.",

  engine: new OpenAIResponsesEngine(),

} as const;