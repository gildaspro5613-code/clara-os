/**
 * ============================================
 * CLARA OS
 * ElevenLabs Connector
 * --------------------------------------------
 * File : elevenlabs-connector.ts
 * Responsibility :
 * Defines the ElevenLabs connector contract.
 * ============================================
 */

import { Connector } from "@/lib/connectors/core/connector";
import type { ElevenLabsContext } from "./elevenlabs-context";
import type { ElevenLabsResult } from "./elevenlabs-result";

/**
 * ElevenLabs connector.
 */
export interface ElevenLabsConnector extends Connector {

  /**
   * Executes an ElevenLabs operation.
   */
  execute(context: ElevenLabsContext): Promise<ElevenLabsResult>;

  /**
   * Converts text to speech and returns the audio buffer.
   */
  textToSpeech(context: ElevenLabsContext): Promise<ElevenLabsResult>;

  /**
   * Lists all available voices.
   */
  listVoices(context: ElevenLabsContext): Promise<ElevenLabsResult>;

  /**
   * Retrieves a single voice by its identifier.
   */
  getVoice(context: ElevenLabsContext): Promise<ElevenLabsResult>;

  /**
   * Lists all available models.
   */
  getModels(context: ElevenLabsContext): Promise<ElevenLabsResult>;

}
