/**
 * ============================================
 * CLARA OS
 * ElevenLabs Connector
 * --------------------------------------------
 * File : elevenlabs-context.ts
 * Responsibility :
 * Defines the execution context
 * for ElevenLabs operations.
 * ============================================
 */

/**
 * ElevenLabs operations supported by Clara.
 */
export type ElevenLabsOperation =
  | "text-to-speech"
  | "list-voices"
  | "get-voice"
  | "get-models";

/**
 * Execution context for an ElevenLabs operation.
 */
export interface ElevenLabsContext {

  /**
   * Operation to execute.
   */
  operation: ElevenLabsOperation;

  /**
   * Text to synthesize into speech.
   */
  text?: string;

  /**
   * ElevenLabs voice identifier to use for synthesis.
   */
  voiceId?: string;

  /**
   * ElevenLabs model identifier to use for synthesis.
   * Defaults to "eleven_multilingual_v2" when not provided.
   */
  modelId?: string;

  /**
   * Voice stability (0–1). Higher values produce more consistent output.
   */
  stability?: number;

  /**
   * Voice similarity boost (0–1). Controls how closely the output
   * resembles the original voice.
   */
  similarityBoost?: number;

  /**
   * Voice style (0–1). Amplifies the style of the original speaker.
   * Only supported by v2 models.
   */
  style?: number;

  /**
   * Whether to use speaker boost for enhanced clarity.
   */
  useSpeakerBoost?: boolean;

  /**
   * Output audio format.
   * Defaults to "mp3_44100_128" when not provided.
   */
  outputFormat?: string;

}
